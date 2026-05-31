import { WS_OPEN_STATE } from '@/modules/websocket/services/websocket-state.service.js';
import type { RealtimeClientConnection } from '@/shared/types.js';

/**
 * Thin transport adapter that gives WebSocket connections the same interface as
 * SSE writers used by API routes (`send`, `setSessionId`, `getSessionId`).
 *
 * Supports multiple connected clients for the same session: `send()` broadcasts
 * to every open WebSocket in the set. Dead connections are pruned lazily on each
 * send.
 */
export class WebSocketWriter {
  private clients: Set<RealtimeClientConnection>;
  sessionId: string | null;
  userId: string | number | null;
  isWebSocketWriter: boolean;

  constructor(ws: RealtimeClientConnection, userId: string | number | null = null) {
    this.clients = new Set();
    this.clients.add(ws);
    this.sessionId = null;
    this.userId = userId;
    this.isWebSocketWriter = true;
  }

  /**
   * Broadcast a message to every connected WebSocket client.
   * Dead connections (readyState !== OPEN) are silently removed.
   *
   * Safe against concurrent modification (e.g. a ws.on('close') callback calling
   * removeClient during iteration) because we snapshot into an array first.
   */
  send(data: unknown): void {
    const payload = JSON.stringify(data);
    const snapshot = Array.from(this.clients);
    let pruned = false;

    for (const client of snapshot) {
      if (client.readyState === WS_OPEN_STATE) {
        try {
          client.send(payload);
        } catch {
          pruned = true;
        }
      } else {
        pruned = true;
      }
    }

    // Lazily prune dead connections — iterate the live set so the delete works
    if (pruned) {
      for (const client of this.clients) {
        if (client.readyState !== WS_OPEN_STATE) {
          this.clients.delete(client);
        }
      }
    }
  }

  /**
   * Add a new client WebSocket to receive future broadcasts.
   */
  addClient(rawWs: RealtimeClientConnection): void {
    this.clients.add(rawWs);
  }

  /**
   * Remove a client WebSocket (e.g. on disconnect).
   */
  removeClient(rawWs: RealtimeClientConnection): void {
    this.clients.delete(rawWs);
  }

  /**
   * Returns the number of currently registered clients.
   */
  clientCount(): number {
    return this.clients.size;
  }

  /**
   * Returns true when at least one client is still connected.
   */
  hasClients(): boolean {
    for (const client of this.clients) {
      if (client.readyState === WS_OPEN_STATE) {
        return true;
      }
    }
    return false;
  }

  /**
   * @deprecated Use addClient() instead. Kept for backward compat during transition.
   */
  updateWebSocket(newRawWs: RealtimeClientConnection): void {
    this.addClient(newRawWs);
  }

  /**
   * Merge all clients from another writer into this one.
   * Used by the JSONL follower path when an existing writer needs to pick up
   * clients from a new connection.
   */
  mergeWriter(other: WebSocketWriter): void {
    // Snapshot to avoid concurrent modification if other's clients are being iterated
    for (const client of Array.from(other.clients)) {
      this.clients.add(client);
    }
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
