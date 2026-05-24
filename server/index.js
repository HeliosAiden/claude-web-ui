#!/usr/bin/env node
// Load environment variables before other imports execute
import './load-env.js';
import fs from 'fs';
import path from 'path';
import http from 'http';

import express from 'express';
import cors from 'cors';

import { AppError, setWorkspaceRoot } from '@/shared/utils.js';
import { closeSessionsWatcher, initializeSessionsWatcher } from '@/modules/providers/index.js';
import { createWebSocketServer } from '@/modules/websocket/index.js';

import { getConnectableHost } from '../shared/networkHosts.js';

import { findAppRoot, getModuleDir } from './utils/runtime-paths.js';
import {
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
} from './claude-sdk.js';
import {
    spawnCursor,
    abortCursorSession,
    isCursorSessionActive,
    getActiveCursorSessions,
} from './cursor-cli.js';
import {
    queryCodex,
    abortCodexSession,
    isCodexSessionActive,
    getActiveCodexSessions,
} from './openai-codex.js';
import {
    spawnGemini,
    abortGeminiSession,
    isGeminiSessionActive,
    getActiveGeminiSessions,
} from './gemini-cli.js';
import sessionManager from './sessionManager.js';
import {
    stripAnsiSequences,
    normalizeDetectedUrl,
    extractUrlsFromText,
    shouldAutoOpenUrlFromOutput,
} from './utils/url-detection.js';
import gitRoutes from './routes/git.js';
import authRoutes from './routes/auth.js';
import cursorRoutes from './routes/cursor.js';
import commandsRoutes from './routes/commands.js';
import settingsRoutes from './routes/settings.js';
import agentRoutes from './routes/agent.js';
import projectModuleRoutes from './modules/projects/projects.routes.js';
import userRoutes from './routes/user.js';
import geminiRoutes from './routes/gemini.js';
import pluginsRoutes from './routes/plugins.js';
import providerRoutes from './modules/providers/provider.routes.js';
import fccRoutes from './routes/fcc.js';
import modelTestRoutes from './routes/models.js';
import promptTemplatesRoutes from './routes/prompt-templates.js';
import projectFilesRoutes from './routes/project-files.js';
import tokenUsageRoutes from './routes/token-usage.js';
import systemRoutes from './routes/system.js';
import { startEnabledPluginServers, stopAllPlugins, getPluginPort } from './utils/plugin-process-manager.js';
import { appConfigDb, initializeDatabase } from './modules/database/index.js';
import { validateApiKey, authenticateToken, authenticateWebSocket } from './middleware/auth.js';
import { IS_PLATFORM, ALLOWED_ORIGINS } from './constants/config.js';
import { c } from './utils/colors.js';

const __dirname = getModuleDir(import.meta.url);
const APP_ROOT = findAppRoot(__dirname);
const installMode = fs.existsSync(path.join(APP_ROOT, '.git')) ? 'git' : 'npm';

console.log('SERVER_PORT from env:', process.env.SERVER_PORT);

const app = express();
const server = http.createServer(app);

// Single WebSocket server that handles chat, shell, and plugin proxy paths.
const wss = createWebSocketServer(server, {
    verifyClient: {
        isPlatform: IS_PLATFORM,
        authenticateWebSocket,
    },
    chat: {
        queryClaudeSDK,
        spawnCursor,
        queryCodex,
        spawnGemini,
        abortClaudeSDKSession,
        abortCursorSession,
        abortCodexSession,
        abortGeminiSession,
        resolveToolApproval,
        isClaudeSDKSessionActive,
        isCursorSessionActive,
        isCodexSessionActive,
        isGeminiSessionActive,
        reconnectSessionWriter,
        getPendingApprovalsForSession,
        getActiveClaudeSDKSessions,
        getActiveCursorSessions,
        getActiveCodexSessions,
        getActiveGeminiSessions,
        followSessionViaJSONL,
        stopFollowingSession,
        isSessionPtyOwned,
    },
    shell: {
        getSessionById: (sessionId) => sessionManager.getSession(sessionId),
        stripAnsiSequences,
        normalizeDetectedUrl,
        extractUrlsFromText,
        shouldAutoOpenUrlFromOutput,
        abortSDKSession: (sessionId) => abortClaudeSDKSession(sessionId),
        isSDKSessionActive: (sessionId) => isClaudeSDKSessionActive(sessionId),
        registerPtyOwnedSession: (sessionId, projectPath) => registerPtyOwnedSession(sessionId, projectPath),
        unregisterPtyOwnedSession: (sessionId) => unregisterPtyOwnedSession(sessionId),
    },
    getPluginPort,
});

app.locals.wss = wss;

app.use(cors({
  origin: ALLOWED_ORIGINS,
  exposedHeaders: ['X-Refreshed-Token'],
}));
app.use(express.json({
    limit: '50mb',
    type: (req) => {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
            return false;
        }
        return contentType.includes('json');
    }
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Public health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        installMode
    });
});

// Optional API key validation (if configured)
app.use('/api', validateApiKey);

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api', authenticateToken, projectFilesRoutes);
app.use('/api', authenticateToken, tokenUsageRoutes);
app.use('/api', authenticateToken, systemRoutes);
app.use('/api/projects', authenticateToken, projectModuleRoutes);
app.use('/api/git', authenticateToken, gitRoutes);
app.use('/api/cursor', authenticateToken, cursorRoutes);
app.use('/api/commands', authenticateToken, commandsRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/gemini', authenticateToken, geminiRoutes);
app.use('/api/plugins', authenticateToken, pluginsRoutes);
app.use('/api/providers', authenticateToken, providerRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/fcc', fccRoutes);
app.use('/api/models', authenticateToken, modelTestRoutes);
app.use('/api/prompt-templates', authenticateToken, promptTemplatesRoutes);

// Serve public files (like api-docs.html)
app.use(express.static(path.join(APP_ROOT, 'public')));

// Static files served after API routes
app.use(express.static(path.join(APP_ROOT, 'dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else if (filePath.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Serve React app for all other routes (excluding static files)
app.get('*', (req, res) => {
    if (path.extname(req.path)) {
        return res.status(404).send('Not found');
    }

    const indexPath = path.join(APP_ROOT, 'dist', 'index.html');

    if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
    } else {
        const redirectHost = getConnectableHost(req.hostname);
        res.redirect(`${req.protocol}://${redirectHost}:${VITE_PORT}`);
    }
});

// Global error middleware must be last
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
});

// Port isolation: load-env.js skips PORT/HOST from fcc config
const SERVER_PORT = process.env.SERVER_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const DISPLAY_HOST = getConnectableHost(HOST);
const VITE_PORT = process.env.VITE_PORT || 5173;

// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();

        // Prime workspace root from DB
        const dbWorkspaceRoot = appConfigDb.get('workspace_root');
        if (dbWorkspaceRoot) {
          setWorkspaceRoot(dbWorkspaceRoot);
          console.log('[INIT] Workspace root loaded from DB:', dbWorkspaceRoot);
        }

        const distIndexPath = path.join(APP_ROOT, 'dist', 'index.html');
        const isProduction = fs.existsSync(distIndexPath);

        console.log(`${c.info('[INFO]')} Using Claude Agents SDK for Claude integration`);
        console.log('');

        if (isProduction) {
            console.log(`${c.info('[INFO]')} To run in production mode, go to http://${DISPLAY_HOST}:${SERVER_PORT}`);
        }

        console.log(`${c.info('[INFO]')} To run in development mode with hot-module replacement, go to http://${DISPLAY_HOST}:${VITE_PORT}`);

        server.listen(SERVER_PORT, HOST, async () => {
            const appInstallPath = APP_ROOT;

            console.log('');
            console.log(c.dim('═'.repeat(63)));
            console.log(`  ${c.bright('Claude Web UI Server - Ready')}`);
            console.log(c.dim('═'.repeat(63)));
            console.log('');
            console.log(`${c.info('[INFO]')} Server URL:  ${c.bright('http://' + DISPLAY_HOST + ':' + SERVER_PORT)}`);
            console.log(`${c.info('[INFO]')} Installed at: ${c.dim(appInstallPath)}`);
            console.log(`${c.tip('[TIP]')}  Run "claude-web-ui status" for full configuration details`);
            console.log('');

            await initializeSessionsWatcher();

            startEnabledPluginServers().catch(err => {
                console.error('[Plugins] Error during startup:', err.message);
            });
        });

        await closeSessionsWatcher();

        const shutdownPlugins = async () => {
            await stopAllPlugins();
            process.exit(0);
        };
        process.on('SIGTERM', () => void shutdownPlugins());
        process.on('SIGINT', () => void shutdownPlugins());
    } catch (error) {
        console.error('[ERROR] Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
