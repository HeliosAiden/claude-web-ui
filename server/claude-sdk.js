/**
 * Claude SDK Integration
 *
 * This module provides SDK-based integration with Claude using the @anthropic-ai/claude-agent-sdk.
 * It mirrors the interface of claude-cli.js but uses the SDK internally for better performance
 * and maintainability.
 *
 * Key features:
 * - Direct SDK integration without child processes
 * - Session management with abort capability
 * - Options mapping between CLI and SDK formats
 * - WebSocket message streaming
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import crypto from 'crypto';
import { promises as fs } from 'fs';

import path from 'path';
import os from 'os';
import { CLAUDE_MODELS } from '../shared/modelConstants.js';
import { resolveClaudeCodeExecutablePath } from './shared/claude-cli-path.js';
import {
  createNotificationEvent,
  notifyRunFailed,
  notifyRunStopped,
  notifyUserIfEnabled
} from './services/notification-orchestrator.js';
import { sessionsService } from './modules/providers/services/sessions.service.js';
import { providerAuthService } from './modules/providers/services/provider-auth.service.js';
import { createNormalizedMessage } from './shared/utils.js';

const activeSessions = new Map();
const pendingToolApprovals = new Map();
const ptyOwnedSessions = new Map();
// sessionId → {
//   projectPath: string,
//   followerController: AbortController,
//   writer: WebSocketWriter | null,
//   pollTimer: NodeJS.Timeout | null,
//   bytesRead: number,
//   status: 'following' | 'completed' | 'error'
// }

const TOOL_APPROVAL_TIMEOUT_MS = parseInt(process.env.CLAUDE_TOOL_APPROVAL_TIMEOUT_MS, 10) || 55000;

// Prevent the SDK from retrying indefinitely when the upstream API (e.g. FCC proxy)
// returns persistent 500 errors. After this timeout the query is aborted and an
// error propagates to the frontend instead of the chat UI hanging silently.
const QUERY_ABORT_TIMEOUT_MS = parseInt(process.env.CLAUDE_SDK_QUERY_TIMEOUT_MS, 10) || 600_000;

const TOOLS_REQUIRING_INTERACTION = new Set(['AskUserQuestion', 'ExitPlanMode']);

function createRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function computeJSONLPath(sessionId, projectPath) {
  const safePattern = /^[a-zA-Z0-9_.\-:]+$/;
  if (!safePattern.test(sessionId)) {
    throw new Error('Invalid session ID');
  }
  const encodedPath = projectPath.replace(/[^a-zA-Z0-9-]/g, '-');
  return path.join(os.homedir(), '.claude', 'projects', encodedPath, `${sessionId}.jsonl`);
}

function waitForToolApproval(requestId, options = {}) {
  const { timeoutMs = TOOL_APPROVAL_TIMEOUT_MS, signal, onCancel, metadata } = options;

  return new Promise(resolve => {
    let settled = false;

    const finalize = (decision) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(decision);
    };

    let timeout;

    const cleanup = () => {
      pendingToolApprovals.delete(requestId);
      if (timeout) clearTimeout(timeout);
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    // timeoutMs 0 = wait indefinitely (interactive tools)
    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        onCancel?.('timeout');
        finalize(null);
      }, timeoutMs);
    }

    const abortHandler = () => {
      onCancel?.('cancelled');
      finalize({ cancelled: true });
    };

    if (signal) {
      if (signal.aborted) {
        onCancel?.('cancelled');
        finalize({ cancelled: true });
        return;
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    const resolver = (decision) => {
      finalize(decision);
    };
    // Attach metadata for getPendingApprovalsForSession lookup
    if (metadata) {
      Object.assign(resolver, metadata);
    }
    pendingToolApprovals.set(requestId, resolver);
  });
}

function resolveToolApproval(requestId, decision) {
  const resolver = pendingToolApprovals.get(requestId);
  if (resolver) {
    resolver(decision);
  }
}

// Match stored permission entries against a tool + input combo.
// This only supports exact tool names and the Bash(command:*) shorthand
// used by the UI; it intentionally does not implement full glob semantics,
// introduced to stay consistent with the UI's "Allow rule" format.
function matchesToolPermission(entry, toolName, input) {
  if (!entry || !toolName) {
    return false;
  }

  if (entry === toolName) {
    return true;
  }

  const bashMatch = entry.match(/^Bash\((.+):\*\)$/);
  if (toolName === 'Bash' && bashMatch) {
    const allowedPrefix = bashMatch[1];
    let command = '';

    if (typeof input === 'string') {
      command = input.trim();
    } else if (input && typeof input === 'object' && typeof input.command === 'string') {
      command = input.command.trim();
    }

    if (!command) {
      return false;
    }

    return command.startsWith(allowedPrefix);
  }

  return false;
}


/**
 * Maps CLI options to SDK-compatible options format
 * @param {Object} options - CLI options
 * @returns {Object} SDK-compatible options
 */
function mapCliOptionsToSDK(options = {}) {
  const { sessionId, cwd, toolsSettings, permissionMode } = options;

  const sdkOptions = {};

  sdkOptions.env = { ...process.env };
  // Only override the SDK's bundled binary when the user explicitly configures
  // a custom CLI path. The SDK's own binary speaks the correct protocol, and
  // FCC routing is handled via ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN env vars.
  if (process.env.CLAUDE_CLI_PATH) {
    sdkOptions.pathToClaudeCodeExecutable = resolveClaudeCodeExecutablePath(process.env.CLAUDE_CLI_PATH);
  }

  // Map working directory
  if (cwd) {
    sdkOptions.cwd = cwd;
  }

  // Map permission mode
  if (permissionMode && permissionMode !== 'default') {
    sdkOptions.permissionMode = permissionMode;
  }

  // Map tool settings
  const settings = toolsSettings || {
    allowedTools: [],
    disallowedTools: [],
    skipPermissions: false
  };

  // Handle tool permissions
  if (settings.skipPermissions && permissionMode !== 'plan') {
    // When skipping permissions, use bypassPermissions mode
    sdkOptions.permissionMode = 'bypassPermissions';
  }

  let allowedTools = [...(settings.allowedTools || [])];

  // Add plan mode default tools
  if (permissionMode === 'plan') {
    const planModeTools = ['Read', 'Task', 'exit_plan_mode', 'TodoRead', 'TodoWrite', 'WebFetch', 'WebSearch'];
    for (const tool of planModeTools) {
      if (!allowedTools.includes(tool)) {
        allowedTools.push(tool);
      }
    }
  }

  sdkOptions.allowedTools = allowedTools;

  // Use the tools preset to make all default built-in tools available (including AskUserQuestion).
  // This was introduced in SDK 0.1.57. Omitting this preserves existing behavior (all tools available),
  // but being explicit ensures forward compatibility and clarity.
  sdkOptions.tools = { type: 'preset', preset: 'claude_code' };

  sdkOptions.disallowedTools = settings.disallowedTools || [];

  // Map model (default to sonnet)
  // Valid models: sonnet, opus, haiku, opusplan, sonnet[1m]
  sdkOptions.model = options.model || CLAUDE_MODELS.DEFAULT;
  // Model logged at query start below

  // Map system prompt configuration
  sdkOptions.systemPrompt = {
    type: 'preset',
    preset: 'claude_code'  // Required to use CLAUDE.md
  };

  // Map setting sources for CLAUDE.md loading
  // This loads CLAUDE.md from project, user (~/.config/claude/CLAUDE.md), and local directories
  sdkOptions.settingSources = ['project', 'user', 'local'];

  // Map resume session
  if (sessionId) {
    sdkOptions.resume = sessionId;
  }

  return sdkOptions;
}

/**
 * Adds a session to the active sessions map
 * @param {string} sessionId - Session identifier
 * @param {Object} queryInstance - SDK query instance
 * @param {Array<string>} tempImagePaths - Temp image file paths for cleanup
 * @param {string} tempDir - Temp directory for cleanup
 */
function addSession(sessionId, queryInstance, tempImagePaths = [], tempDir = null, writer = null) {
  activeSessions.set(sessionId, {
    instance: queryInstance,
    startTime: Date.now(),
    status: 'active',
    tempImagePaths,
    tempDir,
    writer
  });
}

/**
 * Removes a session from the active sessions map
 * @param {string} sessionId - Session identifier
 */
function removeSession(sessionId) {
  activeSessions.delete(sessionId);
}

/**
 * Gets a session from the active sessions map
 * @param {string} sessionId - Session identifier
 * @returns {Object|undefined} Session data or undefined
 */
function getSession(sessionId) {
  return activeSessions.get(sessionId);
}

/**
 * Gets all active session IDs
 * @returns {Array<string>} Array of active session IDs
 */
function getAllSessions() {
  return Array.from(activeSessions.keys());
}

/**
 * Transforms SDK messages to WebSocket format expected by frontend
 * @param {Object} sdkMessage - SDK message object
 * @returns {Object} Transformed message ready for WebSocket
 */
function transformMessage(sdkMessage) {
  // Extract parent_tool_use_id for subagent tool grouping
  if (sdkMessage.parent_tool_use_id) {
    return {
      ...sdkMessage,
      parentToolUseId: sdkMessage.parent_tool_use_id
    };
  }
  return sdkMessage;
}

/**
 * Extracts token usage from SDK result messages
 * @param {Object} resultMessage - SDK result message
 * @returns {Object|null} Token budget object or null
 */
function extractTokenBudget(resultMessage) {
  if (resultMessage.type !== 'result' || !resultMessage.modelUsage) {
    return null;
  }

  // Get the first model's usage data
  const modelKey = Object.keys(resultMessage.modelUsage)[0];
  const modelData = resultMessage.modelUsage[modelKey];

  if (!modelData) {
    return null;
  }

  // Use cumulative tokens if available (tracks total for the session)
  // Otherwise fall back to per-request tokens
  const inputTokens = modelData.cumulativeInputTokens || modelData.inputTokens || 0;
  const outputTokens = modelData.cumulativeOutputTokens || modelData.outputTokens || 0;
  const cacheReadTokens = modelData.cumulativeCacheReadInputTokens || modelData.cacheReadInputTokens || 0;
  const cacheCreationTokens = modelData.cumulativeCacheCreationInputTokens || modelData.cacheCreationInputTokens || 0;

  // Total used = input + output + cache tokens
  const totalUsed = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens;

  // Use configured context window budget from environment (default 160000)
  // This is the user's budget limit, not the model's context window
  const contextWindow = parseInt(process.env.CONTEXT_WINDOW) || 160000;

  // Token calc logged via token-budget WS event

  return {
    used: totalUsed,
    total: contextWindow
  };
}

/**
 * Handles image processing for SDK queries
 * Saves base64 images to temporary files and returns modified prompt with file paths
 * @param {string} command - Original user prompt
 * @param {Array} images - Array of image objects with base64 data
 * @param {string} cwd - Working directory for temp file creation
 * @returns {Promise<Object>} {modifiedCommand, tempImagePaths, tempDir}
 */
async function handleImages(command, images, cwd) {
  const tempImagePaths = [];
  let tempDir = null;

  if (!images || images.length === 0) {
    return { modifiedCommand: command, tempImagePaths, tempDir };
  }

  try {
    // Create temp directory in the project directory
    const workingDir = cwd || process.cwd();
    tempDir = path.join(workingDir, '.tmp', 'images', Date.now().toString());
    await fs.mkdir(tempDir, { recursive: true });

    // Save each image to a temp file
    for (const [index, image] of images.entries()) {
      // Extract base64 data and mime type
      const matches = image.data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error('Invalid image data format');
        continue;
      }

      const [, mimeType, base64Data] = matches;
      const extension = mimeType.split('/')[1] || 'png';
      const filename = `image_${index}.${extension}`;
      const filepath = path.join(tempDir, filename);

      // Write base64 data to file
      await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
      tempImagePaths.push(filepath);
    }

    // Include the full image paths in the prompt
    let modifiedCommand = command;
    if (tempImagePaths.length > 0 && command && command.trim()) {
      const imageNote = `\n\n[Images provided at the following paths:]\n${tempImagePaths.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      modifiedCommand = command + imageNote;
    }

    // Images processed
    return { modifiedCommand, tempImagePaths, tempDir };
  } catch (error) {
    console.error('Error processing images for SDK:', error);
    return { modifiedCommand: command, tempImagePaths, tempDir };
  }
}

/**
 * Cleans up temporary image files
 * @param {Array<string>} tempImagePaths - Array of temp file paths to delete
 * @param {string} tempDir - Temp directory to remove
 */
async function cleanupTempFiles(tempImagePaths, tempDir) {
  if (!tempImagePaths || tempImagePaths.length === 0) {
    return;
  }

  try {
    // Delete individual temp files
    for (const imagePath of tempImagePaths) {
      await fs.unlink(imagePath).catch(err =>
        console.error(`Failed to delete temp image ${imagePath}:`, err)
      );
    }

    // Delete temp directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(err =>
        console.error(`Failed to delete temp directory ${tempDir}:`, err)
      );
    }

    // Temp files cleaned
  } catch (error) {
    console.error('Error during temp file cleanup:', error);
  }
}

/**
 * Loads MCP server configurations from ~/.claude.json
 * @param {string} cwd - Current working directory for project-specific configs
 * @returns {Object|null} MCP servers object or null if none found
 */
async function loadMcpConfig(cwd) {
  try {
    const claudeConfigPath = path.join(os.homedir(), '.claude.json');

    // Check if config file exists
    try {
      await fs.access(claudeConfigPath);
    } catch (error) {
      // File doesn't exist, return null
      // No config file
      return null;
    }

    // Read and parse config file
    let claudeConfig;
    try {
      const configContent = await fs.readFile(claudeConfigPath, 'utf8');
      claudeConfig = JSON.parse(configContent);
    } catch (error) {
      console.error('Failed to parse ~/.claude.json:', error.message);
      return null;
    }

    // Extract MCP servers (merge global and project-specific)
    let mcpServers = {};

    // Add global MCP servers
    if (claudeConfig.mcpServers && typeof claudeConfig.mcpServers === 'object') {
      mcpServers = { ...claudeConfig.mcpServers };
      // Global MCP servers loaded
    }

    // Add/override with project-specific MCP servers
    if (claudeConfig.claudeProjects && cwd) {
      const projectConfig = claudeConfig.claudeProjects[cwd];
      if (projectConfig && projectConfig.mcpServers && typeof projectConfig.mcpServers === 'object') {
        mcpServers = { ...mcpServers, ...projectConfig.mcpServers };
        // Project MCP servers merged
      }
    }

    // Return null if no servers found
    if (Object.keys(mcpServers).length === 0) {
      return null;
    }
    return mcpServers;
  } catch (error) {
    console.error('Error loading MCP config:', error.message);
    return null;
  }
}

/**
 * Executes a Claude query using the SDK
 * @param {string} command - User prompt/command
 * @param {Object} options - Query options
 * @param {Object} ws - WebSocket connection
 * @returns {Promise<void>}
 */
async function queryClaudeSDK(command, options = {}, ws) {
  const { sessionId, sessionSummary } = options;
  let capturedSessionId = sessionId;
  let sessionCreatedSent = false;
  let tempImagePaths = [];
  let tempDir = null;

  const emitNotification = (event) => {
    notifyUserIfEnabled({
      userId: ws?.userId || null,
      writer: ws,
      event
    });
  };

  let abortController;
  let abortTimer;

  try {
    // Map CLI options to SDK format
    const sdkOptions = mapCliOptionsToSDK(options);

    // Load MCP configuration
    const mcpServers = await loadMcpConfig(options.cwd);
    if (mcpServers) {
      sdkOptions.mcpServers = mcpServers;
    }

    // Handle images - save to temp files and modify prompt
    const imageResult = await handleImages(command, options.images, options.cwd);
    const finalCommand = imageResult.modifiedCommand;
    tempImagePaths = imageResult.tempImagePaths;
    tempDir = imageResult.tempDir;

    sdkOptions.hooks = {
      Notification: [{
        matcher: '',
        hooks: [async (input) => {
          const message = typeof input?.message === 'string' ? input.message : 'Claude requires your attention.';
          emitNotification(createNotificationEvent({
            provider: 'claude',
            sessionId: capturedSessionId || sessionId || null,
            kind: 'action_required',
            code: 'agent.notification',
            meta: { message, sessionName: sessionSummary },
            severity: 'warning',
            requiresUserAction: true,
            dedupeKey: `claude:hook:notification:${capturedSessionId || sessionId || 'none'}:${message}`
          }));
          return {};
        }]
      }]
    };

    // Caveat: in 'auto' and 'bypassPermissions' modes the SDK resolves approval
    // at the permission-mode step and skips this callback, so interactive tools
    // (AskUserQuestion, ExitPlanMode) won't reach the UI — the classifier/bypass
    // auto-approves them and the model acts on a generated answer. Move these
    // tools to a PreToolUse hook (runs before the mode check) if we need them
    // to work in those modes.
    sdkOptions.canUseTool = async (toolName, input, context) => {
      const requiresInteraction = TOOLS_REQUIRING_INTERACTION.has(toolName);

      if (!requiresInteraction) {
        if (sdkOptions.permissionMode === 'bypassPermissions') {
          return { behavior: 'allow', updatedInput: input };
        }

        const isDisallowed = (sdkOptions.disallowedTools || []).some(entry =>
          matchesToolPermission(entry, toolName, input)
        );
        if (isDisallowed) {
          return { behavior: 'deny', message: 'Tool disallowed by settings' };
        }

        const isAllowed = (sdkOptions.allowedTools || []).some(entry =>
          matchesToolPermission(entry, toolName, input)
        );
        if (isAllowed) {
          return { behavior: 'allow', updatedInput: input };
        }
      }

      const requestId = createRequestId();
      ws.send(createNormalizedMessage({ kind: 'permission_request', requestId, toolName, input, sessionId: capturedSessionId || sessionId || null, provider: 'claude' }));
      emitNotification(createNotificationEvent({
        provider: 'claude',
        sessionId: capturedSessionId || sessionId || null,
        kind: 'action_required',
        code: 'permission.required',
        meta: { toolName, sessionName: sessionSummary },
        severity: 'warning',
        requiresUserAction: true,
        dedupeKey: `claude:permission:${capturedSessionId || sessionId || 'none'}:${requestId}`
      }));

      const decision = await waitForToolApproval(requestId, {
        timeoutMs: requiresInteraction ? 0 : undefined,
        signal: context?.signal,
        metadata: {
          _sessionId: capturedSessionId || sessionId || null,
          _toolName: toolName,
          _input: input,
          _receivedAt: new Date(),
        },
        onCancel: (reason) => {
          ws.send(createNormalizedMessage({ kind: 'permission_cancelled', requestId, reason, sessionId: capturedSessionId || sessionId || null, provider: 'claude' }));
        }
      });
      if (!decision) {
        return { behavior: 'deny', message: 'Permission request timed out' };
      }

      if (decision.cancelled) {
        return { behavior: 'deny', message: 'Permission request cancelled' };
      }

      if (decision.allow) {
        if (decision.rememberEntry && typeof decision.rememberEntry === 'string') {
          if (!sdkOptions.allowedTools.includes(decision.rememberEntry)) {
            sdkOptions.allowedTools.push(decision.rememberEntry);
          }
          if (Array.isArray(sdkOptions.disallowedTools)) {
            sdkOptions.disallowedTools = sdkOptions.disallowedTools.filter(entry => entry !== decision.rememberEntry);
          }
        }
        return { behavior: 'allow', updatedInput: decision.updatedInput ?? input };
      }

      return { behavior: 'deny', message: decision.message ?? 'User denied tool use' };
    };

    // Set stream-close timeout for interactive tools (Query constructor reads it synchronously). Claude Agent SDK has a default of 5s and this overrides it
    const prevStreamTimeout = process.env.CLAUDE_CODE_STREAM_CLOSE_TIMEOUT;
    process.env.CLAUDE_CODE_STREAM_CLOSE_TIMEOUT = '300000';

    // Abort controller with timeout prevents the query from hanging indefinitely
    // when upstream returns persistent errors that the SDK retries in a loop.
    abortController = new AbortController();
    abortTimer = setTimeout(() => {
      console.warn('SDK query abort timeout reached, aborting query');
      abortController.abort();
    }, QUERY_ABORT_TIMEOUT_MS);
    sdkOptions.abortController = abortController;

    let queryInstance;
    try {
      queryInstance = query({
        prompt: finalCommand,
        options: sdkOptions
      });
    } catch (hookError) {
      // Older/newer SDK versions may not accept hook shapes yet.
      // Keep notification behavior operational via runtime events even if hook registration fails.
      console.warn('Failed to initialize Claude query with hooks, retrying without hooks:', hookError?.message || hookError);
      delete sdkOptions.hooks;
      queryInstance = query({
        prompt: finalCommand,
        options: sdkOptions
      });
    }

    // Restore immediately — Query constructor already captured the value
    if (prevStreamTimeout !== undefined) {
      process.env.CLAUDE_CODE_STREAM_CLOSE_TIMEOUT = prevStreamTimeout;
    } else {
      delete process.env.CLAUDE_CODE_STREAM_CLOSE_TIMEOUT;
    }

    // Track the query instance for abort capability
    if (capturedSessionId) {
      addSession(capturedSessionId, queryInstance, tempImagePaths, tempDir, ws);
    }

    // Process streaming messages
    console.log('Starting async generator loop for session:', capturedSessionId || 'NEW');
    for await (const message of queryInstance) {
      // Capture session ID from first message
      if (message.session_id && !capturedSessionId) {

        capturedSessionId = message.session_id;
        addSession(capturedSessionId, queryInstance, tempImagePaths, tempDir, ws);

        // Set session ID on writer
        if (ws.setSessionId && typeof ws.setSessionId === 'function') {
          ws.setSessionId(capturedSessionId);
        }

        // Send session-created event only once for new sessions
        if (!sessionId && !sessionCreatedSent) {
          sessionCreatedSent = true;
          ws.send(createNormalizedMessage({ kind: 'session_created', newSessionId: capturedSessionId, sessionId: capturedSessionId, provider: 'claude' }));
        }
      } else {
        // session_id already captured
      }

      // Transform and normalize message via adapter
      const transformedMessage = transformMessage(message);
      const sid = capturedSessionId || sessionId || null;

      // Use adapter to normalize SDK events into NormalizedMessage[]
      const normalized = sessionsService.normalizeMessage('claude', transformedMessage, sid);
      for (const msg of normalized) {
        // Preserve parentToolUseId from SDK wrapper for subagent tool grouping
        if (transformedMessage.parentToolUseId && !msg.parentToolUseId) {
          msg.parentToolUseId = transformedMessage.parentToolUseId;
        }
        ws.send(msg);
      }

      // Extract and send token budget updates from result messages
      if (message.type === 'result') {
        const models = Object.keys(message.modelUsage || {});
        if (models.length > 0) {
          // Model info available in result message
        }
        const tokenBudgetData = extractTokenBudget(message);
        if (tokenBudgetData) {
          ws.send(createNormalizedMessage({ kind: 'status', text: 'token_budget', tokenBudget: tokenBudgetData, sessionId: capturedSessionId || sessionId || null, provider: 'claude' }));
        }
      }
    }

    // Clean up session on completion
    clearTimeout(abortTimer);
    if (capturedSessionId) {
      removeSession(capturedSessionId);
    }

    // Clean up temporary image files
    await cleanupTempFiles(tempImagePaths, tempDir);

    // Send completion event
    ws.send(createNormalizedMessage({ kind: 'complete', exitCode: 0, isNewSession: !sessionId && !!command, sessionId: capturedSessionId, provider: 'claude' }));
    notifyRunStopped({
      userId: ws?.userId || null,
      provider: 'claude',
      sessionId: capturedSessionId || sessionId || null,
      sessionName: sessionSummary,
      stopReason: 'completed'
    });
    // Complete

  } catch (error) {
    console.error('SDK query error:', error);
    clearTimeout(abortTimer);

    // Clean up session on error
    if (capturedSessionId) {
      removeSession(capturedSessionId);
    }

    // Clean up temporary image files on error
    await cleanupTempFiles(tempImagePaths, tempDir);

    const effectiveSid = capturedSessionId || sessionId || null;

    // If the session was aborted because the Shell PTY is taking over,
    // send a graceful complete event so the frontend can switch to
    // follower mode instead of showing an error.
    if (effectiveSid && ptyOwnedSessions.has(effectiveSid)) {
      ws.send(createNormalizedMessage({ kind: 'complete', exitCode: 0, isPtyOwned: true, sessionId: effectiveSid, provider: 'claude' }));
      notifyRunStopped({
        userId: ws?.userId || null,
        provider: 'claude',
        sessionId: effectiveSid,
        sessionName: sessionSummary,
        stopReason: 'pty_takeover'
      });
      return;
    }

    const isAbortError = error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || String(error?.message || '').includes('abort');

    // Check if Claude CLI is installed for a clearer error message
    const installed = await providerAuthService.isProviderInstalled('claude');
    let errorContent;
    if (!installed) {
      errorContent = 'Claude Code is not installed. Please install it first: https://docs.anthropic.com/en/docs/claude-code';
    } else if (isAbortError) {
      errorContent = 'The request timed out after several attempts. The upstream API may be experiencing issues. Please try again or check your FCC/API provider configuration.';
    } else {
      errorContent = error.message;
    }

    // Send error to WebSocket
    ws.send(createNormalizedMessage({ kind: 'error', content: errorContent, sessionId: effectiveSid, provider: 'claude' }));
    notifyRunFailed({
      userId: ws?.userId || null,
      provider: 'claude',
      sessionId: effectiveSid,
      sessionName: sessionSummary,
      error
    });
  }
}

/**
 * Aborts an active SDK session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if session was aborted, false if not found
 */
async function abortClaudeSDKSession(sessionId) {
  const session = getSession(sessionId);

  if (!session) {
    console.log(`Session ${sessionId} not found`);
    return false;
  }

  try {
    console.log(`Aborting SDK session: ${sessionId}`);

    // Call interrupt() on the query instance
    await session.instance.interrupt();

    // Update session status
    session.status = 'aborted';

    // Clean up temporary image files
    await cleanupTempFiles(session.tempImagePaths, session.tempDir);

    // Clean up session
    removeSession(sessionId);

    return true;
  } catch (error) {
    console.error(`Error aborting session ${sessionId}:`, error);
    return false;
  }
}

/**
 * Checks if an SDK session is currently active
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if session is active
 */
function isClaudeSDKSessionActive(sessionId) {
  const session = getSession(sessionId);
  return session && session.status === 'active';
}

/**
 * Gets all active SDK session IDs
 * @returns {Array<string>} Array of active session IDs
 */
function getActiveClaudeSDKSessions() {
  return getAllSessions();
}

/**
 * Get pending tool approvals for a specific session.
 * @param {string} sessionId - The session ID
 * @returns {Array} Array of pending permission request objects
 */
function getPendingApprovalsForSession(sessionId) {
  const pending = [];
  for (const [requestId, resolver] of pendingToolApprovals.entries()) {
    if (resolver._sessionId === sessionId) {
      pending.push({
        requestId,
        toolName: resolver._toolName || 'UnknownTool',
        input: resolver._input,
        context: resolver._context,
        sessionId,
        receivedAt: resolver._receivedAt || new Date(),
      });
    }
  }
  return pending;
}

/**
 * Registers a session as PTY-owned so the chat SDK can switch to follower mode.
 * Called by shell-websocket.service before spawning the PTY.
 * @param {string} sessionId - Session identifier
 * @param {string} projectPath - Project working directory
 */
function registerPtyOwnedSession(sessionId, projectPath) {
  if (!ptyOwnedSessions.has(sessionId)) {
    ptyOwnedSessions.set(sessionId, {
      projectPath,
      followerController: null,
      writer: null,
      pollTimer: null,
      bytesRead: 0,
      status: 'following'
    });
  }
}

/**
 * Unregisters a PTY-owned session.
 * Called by shell-websocket.service on PTY exit or deactivate.
 * @param {string} sessionId - Session identifier
 */
function unregisterPtyOwnedSession(sessionId) {
  const entry = ptyOwnedSessions.get(sessionId);
  if (entry) {
    if (entry.pollTimer) clearInterval(entry.pollTimer);
    if (entry.followerController) entry.followerController.abort();
  }
  ptyOwnedSessions.delete(sessionId);
}

/**
 * Checks if a session is registered as PTY-owned and currently following.
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if session is PTY-owned and following
 */
function isSessionPtyOwned(sessionId) {
  const entry = ptyOwnedSessions.get(sessionId);
  return !!(entry && entry.status === 'following');
}

/**
 * Stops an active JSONL follower for a session.
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if follower was stopped
 */
function stopFollowingSession(sessionId) {
  const entry = ptyOwnedSessions.get(sessionId);
  if (!entry) return false;
  if (entry.pollTimer) clearInterval(entry.pollTimer);
  if (entry.followerController) entry.followerController.abort();
  ptyOwnedSessions.delete(sessionId);
  return true;
}

/**
 * Follows a PTY-owned session by watching its JSONL file for new messages.
 * Reuses transformMessage, sessionsService.normalizeMessage, and
 * extractTokenBudget from the existing SDK pipeline.
 *
 * @param {string} sessionId - Session identifier
 * @param {Object} options - { cwd, sessionSummary }
 * @param {Object} ws - WebSocketWriter instance
 * @returns {Promise<void>}
 */
async function followSessionViaJSONL(sessionId, options, ws) {
  const { cwd } = options;
  const safePattern = /^[a-zA-Z0-9_.\-:]+$/;

  if (!sessionId || !safePattern.test(sessionId)) {
    ws.send(createNormalizedMessage({ kind: 'error', content: 'Invalid session ID', sessionId, provider: 'claude' }));
    return;
  }

  const projectPath = cwd || process.cwd();
  let jsonlPath;
  try {
    jsonlPath = computeJSONLPath(sessionId, projectPath);
  } catch (err) {
    ws.send(createNormalizedMessage({ kind: 'error', content: err.message, sessionId, provider: 'claude' }));
    return;
  }

  // If already following this session, just swap the writer (reconnect pattern)
  const existing = ptyOwnedSessions.get(sessionId);
  if (existing && existing.status === 'following' && existing.pollTimer) {
    existing.writer = ws;
    if (existing.bytesRead > 0) {
      ws.send(createNormalizedMessage({ kind: 'status', text: 'reconnected_follower', sessionId, provider: 'claude' }));
    }
    return;
  }

  const followerController = new AbortController();
  let bytesRead = 0;
  let partialLine = '';

  const cleanupFollower = (sid) => {
    const entry = ptyOwnedSessions.get(sid);
    if (entry) {
      if (entry.pollTimer) clearInterval(entry.pollTimer);
      ptyOwnedSessions.delete(sid);
    }
  };

  // Resolves the current writer from the registry so reconnections
  // (which swap the writer via existing.writer = ws) are picked up.
  const getWriter = () => ptyOwnedSessions.get(sessionId)?.writer || ws;

  const processLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      return;
    }

    const writer = getWriter();
    const transformed = transformMessage(entry);
    const sid = sessionId;
    const normalized = sessionsService.normalizeMessage('claude', transformed, sid);
    for (const msg of normalized) {
      if (transformed.parentToolUseId && !msg.parentToolUseId) {
        msg.parentToolUseId = transformed.parentToolUseId;
      }
      writer.send(msg);
    }

    if (entry.type === 'result') {
      const tokenBudgetData = extractTokenBudget(entry);
      if (tokenBudgetData) {
        writer.send(createNormalizedMessage({ kind: 'status', text: 'token_budget', tokenBudget: tokenBudgetData, sessionId: sid, provider: 'claude' }));
      }
      writer.send(createNormalizedMessage({ kind: 'complete', exitCode: 0, sessionId: sid, provider: 'claude' }));
      cleanupFollower(sessionId);
    }
  };

  const processChunk = (text) => {
    const lines = text.split('\n');
    if (lines.length === 0) return;
    lines[0] = partialLine + lines[0];
    partialLine = lines.length > 1 ? (lines[lines.length - 1] || '') : '';
    const end = lines.length > 1 ? lines.length - 1 : lines.length;
    for (let i = 0; i < end; i++) {
      const entry = ptyOwnedSessions.get(sessionId);
      if (!entry || entry.status !== 'following') return;
      processLine(lines[i]);
    }
  };

  // Register (or update) the ptyOwnedSessions entry
  ptyOwnedSessions.set(sessionId, {
    projectPath,
    followerController,
    writer: ws,
    pollTimer: null,
    bytesRead: 0,
    status: 'following'
  });

  // Send session-created so the frontend knows this is a live session
  ws.send(createNormalizedMessage({ kind: 'session_created', newSessionId: sessionId, sessionId, provider: 'claude' }));

  try {
    // Phase 1: Catch-up — read existing file content
    let fileExists = false;
    try {
      const content = await fs.readFile(jsonlPath, 'utf8');
      fileExists = true;
      bytesRead = Buffer.byteLength(content, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        processLine(lines[i]);
      }
      partialLine = lines[lines.length - 1] || '';
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    const reg = ptyOwnedSessions.get(sessionId);
    if (reg) reg.bytesRead = bytesRead;

    if (!fileExists) {
      ws.send(createNormalizedMessage({ kind: 'status', text: 'waiting_for_session_data', sessionId, provider: 'claude' }));
    }

    // Check if already completed during catch-up
    if (!ptyOwnedSessions.has(sessionId)) return;

    // Phase 2: Polling loop
    const pollTimer = setInterval(async () => {
      try {
        if (followerController.signal.aborted) {
          clearInterval(pollTimer);
          return;
        }

        const currentEntry = ptyOwnedSessions.get(sessionId);
        if (!currentEntry || currentEntry.status !== 'following') {
          clearInterval(pollTimer);
          return;
        }

        let stat;
        try {
          stat = await fs.stat(jsonlPath);
        } catch (err) {
          if (err.code === 'ENOENT') return;
          throw err;
        }

        if (stat.size === 0) return;

        if (stat.size < bytesRead) {
          // File truncated — re-read from start
          bytesRead = 0;
          partialLine = '';
          const content = await fs.readFile(jsonlPath, 'utf8');
          bytesRead = Buffer.byteLength(content, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            processLine(lines[i]);
          }
          partialLine = lines[lines.length - 1] || '';
          if (currentEntry) currentEntry.bytesRead = bytesRead;
          return;
        }

        if (stat.size > bytesRead) {
          const fd = await fs.open(jsonlPath, 'r');
          const readSize = stat.size - bytesRead;
          const buf = Buffer.alloc(readSize);
          await fd.read(buf, 0, readSize, bytesRead);
          await fd.close();
          bytesRead = stat.size;

          processChunk(buf.toString('utf8'));
          if (currentEntry) currentEntry.bytesRead = bytesRead;
        }
      } catch (err) {
        if (err.code === 'ENOENT') return;
        console.error('JSONL poll error:', err);
      }
    }, 500);

    const updatedReg = ptyOwnedSessions.get(sessionId);
    if (updatedReg) updatedReg.pollTimer = pollTimer;

  } catch (error) {
    console.error('followSessionViaJSONL error:', error);
    ws.send(createNormalizedMessage({ kind: 'error', content: error.message, sessionId, provider: 'claude' }));
    cleanupFollower(sessionId);
  }
}

/**
 * Reconnect a session's WebSocketWriter to a new raw WebSocket.
 * Called when client reconnects (e.g. page refresh) while SDK is still running.
 * @param {string} sessionId - The session ID
 * @param {Object} newRawWs - The new raw WebSocket connection
 * @returns {boolean} True if writer was successfully reconnected
 */
function reconnectSessionWriter(sessionId, newRawWs) {
  const session = getSession(sessionId);
  if (!session?.writer?.updateWebSocket) return false;
  session.writer.updateWebSocket(newRawWs);
  console.log(`[RECONNECT] Writer swapped for session ${sessionId}`);
  return true;
}

// Export public API
export {
  queryClaudeSDK,
  abortClaudeSDKSession,
  isClaudeSDKSessionActive,
  getActiveClaudeSDKSessions,
  resolveToolApproval,
  getPendingApprovalsForSession,
  reconnectSessionWriter,
  followSessionViaJSONL,
  stopFollowingSession,
  isSessionPtyOwned,
  registerPtyOwnedSession,
  unregisterPtyOwnedSession,
};
