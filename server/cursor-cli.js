import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import crossSpawn from 'cross-spawn';

import { sessionsService } from './modules/providers/services/sessions.service.js';
import { providerAuthService } from './modules/providers/services/provider-auth.service.js';
import { createNormalizedMessage } from './shared/utils.js';

// Use cross-spawn on Windows for better command execution
const spawnFunction = process.platform === 'win32' ? crossSpawn : spawn;

let activeCursorProcesses = new Map(); // Track active processes by session ID
let activeCursorWriters = new Map(); // Track writers by session ID for multi-client broadcast

const WORKSPACE_TRUST_PATTERNS = [
  /workspace trust required/i,
  /do you trust the contents of this directory/i,
  /working with untrusted contents/i,
  /pass --trust,\s*--yolo,\s*or -f/i
];

function isWorkspaceTrustPrompt(text = '') {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return WORKSPACE_TRUST_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Handles image and file attachments for Cursor CLI
 * Saves base64 attachments to temporary files and returns modified command with file paths
 * @param {string} command - Original user prompt
 * @param {Array} images - Array of image objects with base64 data
 * @param {Array} files - Array of file objects with base64 data
 * @param {string} workingDir - Working directory for temp file creation
 * @returns {Promise<{modifiedCommand: string, tempImagePaths: string[], tempDir: string|null}>}
 */
async function handleAttachments(command, images, files, workingDir) {
  const tempImagePaths = [];
  let tempDir = null;

  if ((!images || images.length === 0) && (!files || files.length === 0)) {
    return { modifiedCommand: command, tempImagePaths, tempDir };
  }

  try {
    tempDir = path.join(workingDir, '.tmp', 'attachments', Date.now().toString());
    await fs.mkdir(tempDir, { recursive: true });

    let pathIndex = 0;

    // Process images
    if (images && images.length > 0) {
      for (const image of images) {
        const matches = image.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) { continue; }

        const [, mimeType, base64Data] = matches;
        const extension = mimeType.split('/')[1] || 'png';
        const filename = `image_${pathIndex}.${extension}`;
        const filepath = path.join(tempDir, filename);
        await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
        tempImagePaths.push(filepath);
        pathIndex++;
      }
    }

    // Process files
    if (files && files.length > 0) {
      for (const file of files) {
        const matches = file.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) { continue; }

        const [, mimeType, base64Data] = matches;
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `file_${pathIndex}_${safeName}`;
        const filepath = path.join(tempDir, filename);
        await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
        tempImagePaths.push(filepath);
        pathIndex++;
      }
    }

    // Include attachment paths in the prompt for the CLI to reference
    let modifiedCommand = command;
    if (tempImagePaths.length > 0 && command && command.trim()) {
      const parts = [];
      if (images && images.length > 0) parts.push(`${images.length} image(s)`);
      if (files && files.length > 0) parts.push(`${files.length} file(s)`);
      const attachmentNote = `\n\n[${parts.join(', ')} attached at the following paths:]\n${tempImagePaths.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      modifiedCommand = command + attachmentNote;
    }

    return { modifiedCommand, tempImagePaths, tempDir };
  } catch (error) {
    console.error('Error processing attachments for Cursor:', error);
    return { modifiedCommand: command, tempImagePaths, tempDir };
  }
}

async function spawnCursor(command, options = {}, ws) {
  return new Promise(async (resolve, reject) => {
    const { sessionId, projectPath, cwd, resume, toolsSettings, skipPermissions, model, sessionSummary, images, files } = options;
    let capturedSessionId = sessionId; // Track session ID throughout the process
    let sessionCreatedSent = false; // Track if we've already sent session-created event
    let hasRetriedWithTrust = false;
    let settled = false;

    // Use tools settings passed from frontend, or defaults
    const settings = toolsSettings || {
      allowedShellCommands: [],
      skipPermissions: false
    };

    // Build Cursor CLI command
    const baseArgs = [];

    // Build flags allowing both resume and prompt together (reply in existing session)
    // Treat presence of sessionId as intention to resume, regardless of resume flag
    if (sessionId) {
      baseArgs.push('--resume=' + sessionId);
    }

    if (finalCommand && finalCommand.trim()) {
      // Provide a prompt (works for both new and resumed sessions)
      baseArgs.push('-p', finalCommand);

      // Add model flag if specified (only meaningful for new sessions; harmless on resume)
      if (!sessionId && model) {
        baseArgs.push('--model', model);
      }

      // Request streaming JSON when we are providing a prompt
      baseArgs.push('--output-format', 'stream-json');
    }

    // Add skip permissions flag if enabled
    if (skipPermissions || settings.skipPermissions) {
      baseArgs.push('-f');
      console.log('Using -f flag (skip permissions)');
    }

    // Use cwd (actual project directory) instead of projectPath
    const workingDir = cwd || projectPath || process.cwd();

    // Handle image/file attachments before passing command to Cursor CLI
    let finalCommand = command;
    let tempImagePaths = [];
    let tempDir = null;
    if (command && command.trim() && (images?.length > 0 || files?.length > 0)) {
      const attachmentResult = await handleAttachments(command, images, files, workingDir);
      finalCommand = attachmentResult.modifiedCommand;
      tempImagePaths = attachmentResult.tempImagePaths;
      tempDir = attachmentResult.tempDir;
    }

    // Store process reference for potential abort
    const processKey = capturedSessionId || Date.now().toString();

    const settleOnce = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    const runCursorProcess = (args, runReason = 'initial') => {
      const isTrustRetry = runReason === 'trust-retry';
      let runSawWorkspaceTrustPrompt = false;
      let stdoutLineBuffer = '';

      if (isTrustRetry) {
        console.log('Retrying Cursor CLI with --trust after workspace trust prompt');
      }

      console.log('Spawning Cursor CLI:', 'cursor-agent', args.join(' '));
      console.log('Working directory:', workingDir);
      console.log('Session info - Input sessionId:', sessionId, 'Resume:', resume);

      const cursorProcess = spawnFunction('cursor-agent', args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env } // Inherit all environment variables
      });

      activeCursorProcesses.set(processKey, cursorProcess);
      cursorProcess.tempImagePaths = tempImagePaths;
      cursorProcess.tempDir = tempDir;

      const shouldSuppressForTrustRetry = (text) => {
        if (hasRetriedWithTrust || args.includes('--trust')) {
          return false;
        }
        if (!isWorkspaceTrustPrompt(text)) {
          return false;
        }

        runSawWorkspaceTrustPrompt = true;
        return true;
      };

      const processCursorOutputLine = (line) => {
        if (!line || !line.trim()) {
          return;
        }

        try {
          const response = JSON.parse(line);

          // Handle different message types
          switch (response.type) {
            case 'system':
              if (response.subtype === 'init') {
                // Capture session ID
                if (response.session_id && !capturedSessionId) {
                  capturedSessionId = response.session_id;

                  // Update process key with captured session ID
                  if (processKey !== capturedSessionId) {
                    activeCursorProcesses.delete(processKey);
                    activeCursorProcesses.set(capturedSessionId, cursorProcess);
                  }

                  // Track writer for multi-client broadcast
                  activeCursorWriters.set(capturedSessionId, ws);

                  // Set session ID on writer (for API endpoint compatibility)
                  if (ws.setSessionId && typeof ws.setSessionId === 'function') {
                    ws.setSessionId(capturedSessionId);
                  }

                  // Send session-created event only once for new sessions
                  if (!sessionId && !sessionCreatedSent) {
                    sessionCreatedSent = true;
                    ws.send(createNormalizedMessage({ kind: 'session_created', newSessionId: capturedSessionId, model: response.model, cwd: response.cwd, sessionId: capturedSessionId, provider: 'cursor' }));
                  }
                }

                // System info — no longer needed by the frontend (session-lifecycle 'created' handles nav).
              }
              break;

            case 'user':
              // User messages are not displayed in the UI — skip.
              break;

            case 'assistant':
              // Accumulate assistant message chunks
              if (response.message && response.message.content && response.message.content.length > 0) {
                const normalized = sessionsService.normalizeMessage('cursor', response, capturedSessionId || sessionId || null);
                for (const msg of normalized) ws.send(msg);
              }
              break;

            case 'result': {
              // Session complete — send stream end + lifecycle complete with result payload
              const resultText = typeof response.result === 'string' ? response.result : '';
              ws.send(createNormalizedMessage({
                kind: 'complete',
                exitCode: response.subtype === 'success' ? 0 : 1,
                resultText,
                isError: response.subtype !== 'success',
                sessionId: capturedSessionId || sessionId, provider: 'cursor',
              }));
              break;
            }

            default:
              // Unknown message types — ignore.
          }
        } catch (parseError) {
          if (shouldSuppressForTrustRetry(line)) {
            return;
          }

          // If not JSON, send as stream delta via adapter
          const normalized = sessionsService.normalizeMessage('cursor', line, capturedSessionId || sessionId || null);
          for (const msg of normalized) ws.send(msg);
        }
      };

      // Handle stdout (streaming JSON responses)
      cursorProcess.stdout.on('data', (data) => {
        const rawOutput = data.toString();

        // Stream chunks can split JSON objects across packets; keep trailing partial line.
        stdoutLineBuffer += rawOutput;
        const completeLines = stdoutLineBuffer.split(/\r?\n/);
        stdoutLineBuffer = completeLines.pop() || '';

        completeLines.forEach((line) => {
          processCursorOutputLine(line.trim());
        });
      });

      // Handle stderr
      cursorProcess.stderr.on('data', (data) => {
        const stderrText = data.toString();
        console.error('Cursor CLI stderr:', stderrText);

        if (shouldSuppressForTrustRetry(stderrText)) {
          return;
        }

        ws.send(createNormalizedMessage({ kind: 'error', content: stderrText, sessionId: capturedSessionId || sessionId || null, provider: 'cursor' }));
      });

      // Handle process completion
      cursorProcess.on('close', async (code) => {
        const finalSessionId = capturedSessionId || sessionId || processKey;
        activeCursorProcesses.delete(finalSessionId);
        activeCursorWriters.delete(finalSessionId);

        // Flush any final unterminated stdout line before completion handling.
        if (stdoutLineBuffer.trim()) {
          processCursorOutputLine(stdoutLineBuffer.trim());
          stdoutLineBuffer = '';
        }

        if (
          runSawWorkspaceTrustPrompt &&
          code !== 0 &&
          !hasRetriedWithTrust &&
          !args.includes('--trust')
        ) {
          hasRetriedWithTrust = true;
          runCursorProcess([...args, '--trust'], 'trust-retry');
          return;
        }

        ws.send(createNormalizedMessage({ kind: 'complete', exitCode: code, isNewSession: !sessionId && !!command, sessionId: finalSessionId, provider: 'cursor' }));

        // Clean up temporary image/files directories
        if (cursorProcess.tempImagePaths && cursorProcess.tempImagePaths.length > 0) {
          for (const imagePath of cursorProcess.tempImagePaths) {
            fs.unlink(imagePath).catch(() => {});
          }
          if (cursorProcess.tempDir) {
            fs.rm(cursorProcess.tempDir, { recursive: true, force: true }).catch(() => {});
          }
        }

        if (code === 0) {
          settleOnce(() => resolve());
        } else {
          settleOnce(() => reject(new Error(`Cursor CLI exited with code ${code}`)));
        }
      });

      // Handle process errors
      cursorProcess.on('error', async (error) => {
        console.error('Cursor CLI process error:', error);

        // Clean up process reference on error
        const finalSessionId = capturedSessionId || sessionId || processKey;
        activeCursorProcesses.delete(finalSessionId);

        // Check if Cursor CLI is installed for a clearer error message
        const installed = await providerAuthService.isProviderInstalled('cursor');
        const errorContent = !installed
          ? 'Cursor CLI is not installed. Please install it from https://cursor.com'
          : error.message;

        ws.send(createNormalizedMessage({ kind: 'error', content: errorContent, sessionId: capturedSessionId || sessionId || null, provider: 'cursor' }));

        settleOnce(() => reject(error));
      });

      // Close stdin since Cursor doesn't need interactive input
      cursorProcess.stdin.end();
    };

    runCursorProcess(baseArgs, 'initial');
  });
}

function abortCursorSession(sessionId) {
  const process = activeCursorProcesses.get(sessionId);
  if (process) {
    console.log(`Aborting Cursor session: ${sessionId}`);
    process.kill('SIGTERM');
    activeCursorProcesses.delete(sessionId);
    activeCursorWriters.delete(sessionId);
    return true;
  }
  return false;
}

function isCursorSessionActive(sessionId) {
  return activeCursorProcesses.has(sessionId);
}

function getActiveCursorSessions() {
  return Array.from(activeCursorProcesses.keys());
}

/**
 * Add a WebSocket client to an active Cursor session's writer for broadcasting.
 * @param {string} sessionId - Session ID
 * @param {object} rawWs - WebSocket or WebSocketWriter to add
 * @returns {boolean} - Whether the client was added
 */
function addCursorSessionClient(sessionId, rawWs) {
  const writer = activeCursorWriters.get(sessionId);
  if (!writer?.addClient) return false;
  writer.addClient(rawWs);
  return true;
}

export {
  spawnCursor,
  abortCursorSession,
  isCursorSessionActive,
  getActiveCursorSessions,
  addCursorSessionClient
};
