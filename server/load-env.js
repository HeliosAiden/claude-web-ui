// Load environment variables from .env before other imports execute.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { findAppRoot, getModuleDir } from './utils/runtime-paths.js';

const __dirname = getModuleDir(import.meta.url);
// Resolve the repo/app root via the nearest /server folder so this file keeps finding the
// same top-level .env file from both /server/load-env.js and /dist-server/server/load-env.js.
const APP_ROOT = findAppRoot(__dirname);

function loadEnvFromFile(envPath) {
  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0 && !process.env[key]) {
          process.env[key] = valueParts.join('=').trim();
        }
      }
    });
  } catch {
    // .env file is optional
  }
}

// 1. CWD .env — loaded first so user-project overrides take priority over
//    the package's built-in defaults and FCC auto-discovery.
loadEnvFromFile(path.join(process.cwd(), '.env'));

// 2. Global user config — persistent cross-project settings.
loadEnvFromFile(path.join(os.homedir(), '.config', 'claude-web-ui', '.env'));

// 3. Package .env — built-in defaults shipped with the release.
loadEnvFromFile(path.join(APP_ROOT, '.env'));

// Load Free Claude Code (fcc-server) configuration if available.
// FCC acts as a proxy between the Claude SDK and alternative API providers.
// We selectively import relevant vars while skipping PORT/HOST to avoid conflicts.
{
  const FCC_ENV_PATH = path.join(os.homedir(), '.config', 'free-claude-code', '.env');
  // Vars to skip — these would conflict with claude-web-ui's own configuration
  const SKIP_VARS = new Set([
    'PORT', 'HOST', 'SERVER_PORT', 'VITE_PORT',
    'DATABASE_PATH', 'LOG_FILE',
  ]);
  try {
    const fccEnv = fs.readFileSync(FCC_ENV_PATH, 'utf8');
    fccEnv.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const eqIdx = trimmedLine.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmedLine.slice(0, eqIdx).trim();
      const value = trimmedLine.slice(eqIdx + 1).trim();
      if (key && !SKIP_VARS.has(key) && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // fcc config is optional — silently skip if not present
  }
}

// Keep the default database in a stable user-level location so rebuilding dist-server
// never changes where the backend stores auth.db when DATABASE_PATH is not set explicitly.
const DEFAULT_DATABASE_PATH = path.join(os.homedir(), '.cloudcli', 'auth.db');

if (!process.env.DATABASE_PATH) {
  process.env.DATABASE_PATH = DEFAULT_DATABASE_PATH;
}
