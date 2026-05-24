import type { VerifyClientCallbackAsync } from 'ws';

import type { AuthenticatedWebSocketRequest } from '@/shared/types.js';

import { ALLOWED_ORIGINS } from '../../../constants/config.js';

type WebSocketAuthDependencies = {
  isPlatform: boolean;
  authenticateWebSocket: (
    token: string | null,
    sharedSecret?: string | null,
  ) => Promise<{
    id?: string | number;
    userId?: string | number;
    username?: string;
    [key: string]: unknown;
  } | null>;
};

/**
 * Authenticates websocket upgrade requests before the `connection` handler runs.
 */
export function verifyWebSocketClient(
  info: Parameters<VerifyClientCallbackAsync<AuthenticatedWebSocketRequest>>[0],
  dependencies: WebSocketAuthDependencies,
  callback: (result: boolean) => void
): void {
  const request = info.req as AuthenticatedWebSocketRequest;
  console.log('WebSocket connection attempt to:', request.url);

  const origin = info.origin ?? request.headers.origin ?? null;
  if (!origin) {
    console.log('[WARN] WebSocket connection rejected: missing Origin header');
    callback(false);
    return;
  }
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.log(`[WARN] WebSocket connection rejected: origin "${origin}" not allowed`);
    callback(false);
    return;
  }

  // Platform mode: validate shared secret, then use the first DB user.
  if (dependencies.isPlatform) {
    const sharedSecret =
      (request.headers['x-platform-shared-secret'] as string | undefined) ??
      null;
    dependencies.authenticateWebSocket(null, sharedSecret).then((user) => {
      if (!user) {
        console.log('[WARN] Platform mode WebSocket authentication failed');
        callback(false);
        return;
      }

      request.user = user;
      console.log('[OK] Platform mode WebSocket authenticated for user:', user.username);
      callback(true);
    });
    return;
  }

  // OSS mode: read JWT from query string first, then Authorization header.
  const upgradeUrl = new URL(request.url ?? '/', 'http://localhost');
  const token =
    upgradeUrl.searchParams.get('token') ??
    request.headers.authorization?.split(' ')[1] ??
    null;

  dependencies.authenticateWebSocket(token).then((user) => {
    if (!user) {
      console.log('[WARN] WebSocket authentication failed');
      callback(false);
      return;
    }

    request.user = user;
    console.log('[OK] WebSocket authenticated for user:', user.username);
    callback(true);
  });
}
