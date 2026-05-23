import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import express from 'express';

import { IS_PLATFORM } from '../constants/config.js';
import { findAppRoot, getModuleDir } from '../utils/runtime-paths.js';

const __dirname = getModuleDir(import.meta.url);
const APP_ROOT = findAppRoot(__dirname);
const installMode = fs.existsSync(path.join(APP_ROOT, '.git')) ? 'git' : 'npm';

const router = express.Router();

// System update endpoint
router.post('/system/update', async (req, res) => {
    try {
        const projectRoot = APP_ROOT;

        console.log('Starting system update from directory:', projectRoot);

        const updateCommand = IS_PLATFORM
            ? 'npm run update:platform'
            : installMode === 'git'
                ? 'git checkout main && git pull && npm install'
                : 'npm install -g @heliosaiden/claude-web-ui@latest';

        const updateCwd = IS_PLATFORM || installMode === 'git'
            ? projectRoot
            : os.homedir();

        const child = spawn('sh', ['-c', updateCommand], {
            cwd: updateCwd,
            env: { ...process.env }
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('Update output:', text);
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            console.error('Update error:', text);
        });

        child.on('close', (code) => {
            if (code === 0) {
                res.json({
                    success: true,
                    output: output || 'Update completed successfully',
                    message: 'Update completed. Please restart the server to apply changes.'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Update command failed',
                    output: output,
                    errorOutput: errorOutput
                });
            }
        });

        child.on('error', (error) => {
            console.error('Update process error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        });
    } catch (error) {
        console.error('System update error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
