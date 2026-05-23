/**
 * Environment Flag: Is Platform
 * Indicates if the app is running in Platform mode (hosted) or OSS mode (self-hosted)
 */
export const IS_PLATFORM = process.env.VITE_IS_PLATFORM === 'true';

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173'];

export const IS_PLAIN_SHELL_ENABLED = process.env.IS_PLAIN_SHELL_ENABLED === 'true';

/**
 * Shared secret for platform mode.
 * When set, the reverse proxy must include this value in the
 * x-platform-shared-secret header on every request.  Without it,
 * anyone who reaches the backend is immediately authenticated as
 * the first database user.  If unset, platform mode still works
 * but logs a startup warning.
 */
export const PLATFORM_SHARED_SECRET = process.env.PLATFORM_SHARED_SECRET || null;