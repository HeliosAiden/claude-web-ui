/**
 * Session-keyed message store — Zustand-backed.
 *
 * Holds per-session state in a Record keyed by sessionId.
 * Session switch = change activeSessionId pointer. No clearing. Old data stays.
 * WebSocket handler = store.appendRealtime(msg.sessionId, msg). One line.
 * No localStorage for messages. Backend JSONL is the source of truth.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { authenticatedFetch } from '../utils/api';
import type { LLMProvider } from '../types/app';

// ─── NormalizedMessage (mirrors server/adapters/types.js) ────────────────────

export type MessageKind =
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'thinking'
  | 'stream_delta'
  | 'stream_end'
  | 'error'
  | 'complete'
  | 'status'
  | 'permission_request'
  | 'permission_cancelled'
  | 'session_created'
  | 'interactive_prompt'
  | 'task_notification';

export interface NormalizedMessage {
  id: string;
  sessionId: string;
  timestamp: string;
  provider: LLMProvider;
  kind: MessageKind;

  // kind-specific fields (flat for simplicity)
  role?: 'user' | 'assistant';
  content?: string;
  displayText?: string;
  commandName?: string;
  commandMessage?: string;
  commandArgs?: string;
  isLocalCommand?: boolean;
  isLocalCommandStdout?: boolean;
  isCompactSummary?: boolean;
  images?: string[];
  files?: unknown[];
  toolName?: string;
  toolInput?: unknown;
  toolId?: string;
  toolResult?: { content: string; isError: boolean; toolUseResult?: unknown } | null;
  isError?: boolean;
  text?: string;
  tokens?: number;
  canInterrupt?: boolean;
  tokenBudget?: unknown;
  requestId?: string;
  input?: unknown;
  context?: unknown;
  newSessionId?: string;
  status?: string;
  summary?: string;
  exitCode?: number;
  actualSessionId?: string;
  parentToolUseId?: string;
  subagentTools?: unknown[];
  isFinal?: boolean;
  // Cursor-specific ordering
  sequence?: number;
  rowid?: number;
}

// ─── Per-session slot ────────────────────────────────────────────────────────

export type SessionStatus = 'idle' | 'loading' | 'streaming' | 'error';

export interface SessionSlot {
  serverMessages: NormalizedMessage[];
  realtimeMessages: NormalizedMessage[];
  merged: NormalizedMessage[];
  /** @internal Cache-invalidation refs for computeMerged */
  _lastServerRef: NormalizedMessage[];
  _lastRealtimeRef: NormalizedMessage[];
  status: SessionStatus;
  fetchedAt: number;
  total: number;
  hasMore: boolean;
  offset: number;
  tokenUsage: unknown;
}

const EMPTY: NormalizedMessage[] = [];

function createEmptySlot(): SessionSlot {
  return {
    serverMessages: EMPTY,
    realtimeMessages: EMPTY,
    merged: EMPTY,
    _lastServerRef: EMPTY,
    _lastRealtimeRef: EMPTY,
    status: 'idle',
    fetchedAt: 0,
    total: 0,
    hasMore: false,
    offset: 0,
    tokenUsage: null,
  };
}

/**
 * Compute merged messages: server + realtime, deduped by id and adjacent
 * assistant echo (same trimmed text), so finalized stream rows do not stack
 * on top of the persisted copy before realtime is cleared.
 */
function userTextFingerprint(m: NormalizedMessage): string | null {
  if (m.kind !== 'text' || m.role !== 'user') return null;
  const t = (m.content || '').trim();
  return t.length > 0 ? t : null;
}

function dedupeAdjacentAssistantEchoes(merged: NormalizedMessage[]): NormalizedMessage[] {
  const out: NormalizedMessage[] = [];
  for (const m of merged) {
    const prev = out[out.length - 1];
    if (prev) {
      if (prev.kind === 'stream_delta' && m.kind === 'text' && m.role === 'assistant') {
        const ps = (prev.content || '').trim();
        const ms = (m.content || '').trim();
        if (ps.length > 0 && ps === ms) {
          out[out.length - 1] = m;
          continue;
        }
      }
      if (
        prev.kind === 'text'
        && m.kind === 'text'
        && prev.role === 'assistant'
        && m.role === 'assistant'
      ) {
        const ms = (m.content || '').trim();
        if (ms.length > 0 && ms === (prev.content || '').trim()) {
          continue;
        }
      }
    }
    out.push(m);
  }
  return out;
}

function computeMerged(server: NormalizedMessage[], realtime: NormalizedMessage[]): NormalizedMessage[] {
  if (realtime.length === 0) return server;
  if (server.length === 0) return dedupeAdjacentAssistantEchoes(realtime);
  const serverIds = new Set(server.map(m => m.id));
  const serverUserTexts = new Set(
    server.map(userTextFingerprint).filter((t): t is string => t !== null),
  );
  const extra = realtime.filter((m) => {
    if (serverIds.has(m.id)) return false;
    if (m.id.startsWith('local_')) {
      const fp = userTextFingerprint(m);
      if (fp && serverUserTexts.has(fp)) return false;
    }
    return true;
  });
  if (extra.length === 0) return server;
  return dedupeAdjacentAssistantEchoes([...server, ...extra]);
}

function compareMessagesByTimestamp(left: NormalizedMessage, right: NormalizedMessage): number {
  const leftTime = Date.parse(left.timestamp);
  const rightTime = Date.parse(right.timestamp);

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime) || leftTime === rightTime) {
    return 0;
  }

  return leftTime - rightTime;
}

function rewriteMessageSessionId(
  msg: NormalizedMessage,
  fromSessionId: string,
  toSessionId: string,
): NormalizedMessage {
  const streamingSourceId = `__streaming_${fromSessionId}`;
  const nextId = msg.id === streamingSourceId ? `__streaming_${toSessionId}` : msg.id;

  if (msg.sessionId === toSessionId && nextId === msg.id) {
    return msg;
  }

  return {
    ...msg,
    id: nextId,
    sessionId: toSessionId,
  };
}

function mergeMessagesById(
  existing: NormalizedMessage[],
  incoming: NormalizedMessage[],
): NormalizedMessage[] {
  if (existing.length === 0) return incoming;
  if (incoming.length === 0) return existing;

  const merged = [...existing, ...incoming];
  const deduped: NormalizedMessage[] = [];
  const seen = new Set<string>();

  for (const msg of merged) {
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    deduped.push(msg);
  }

  deduped.sort(compareMessagesByTimestamp);
  return deduped;
}

/** Recompute slot.merged only when input arrays have changed (by reference). */
function recomputeMergedIfNeeded(slot: SessionSlot) {
  if (slot.serverMessages === slot._lastServerRef && slot.realtimeMessages === slot._lastRealtimeRef) {
    return false;
  }
  slot._lastServerRef = slot.serverMessages;
  slot._lastRealtimeRef = slot.realtimeMessages;
  slot.merged = computeMerged(slot.serverMessages, slot.realtimeMessages);
  return true;
}

// ─── Stale threshold ─────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 30_000;
const MAX_REALTIME_MESSAGES = 500;

// ─── Zustand store ───────────────────────────────────────────────────────────

interface SessionStoreState {
  slots: Record<string, SessionSlot>;
  aliases: Record<string, string>;
  activeSessionId: string | null;
}

interface SessionStoreActions {
  _resolveSessionId: (sessionId: string | null | undefined) => string | null;
  _getSlot: (sessionId: string) => SessionSlot;
  setActiveSession: (sessionId: string | null) => void;
  has: (sessionId: string) => boolean;
  fetchFromServer: (
    sessionId: string,
    opts?: {
      provider?: LLMProvider;
      projectId?: string;
      projectPath?: string;
      limit?: number | null;
      offset?: number;
    },
  ) => Promise<SessionSlot>;
  fetchMore: (
    sessionId: string,
    opts?: {
      provider?: LLMProvider;
      projectId?: string;
      projectPath?: string;
      limit?: number;
    },
  ) => Promise<SessionSlot>;
  appendRealtime: (sessionId: string, msg: NormalizedMessage) => void;
  refreshFromServer: (
    sessionId: string,
    _opts?: {
      provider?: LLMProvider;
      projectId?: string;
      projectPath?: string;
    },
  ) => Promise<void>;
  isStale: (sessionId: string) => boolean;
  updateStreaming: (sessionId: string, accumulatedText: string, msgProvider: LLMProvider) => void;
  finalizeStreaming: (sessionId: string) => void;
  clearAllMessages: (sessionId: string) => void;
  getMessages: (sessionId: string) => NormalizedMessage[];
  replaceSessionId: (fromSessionId: string, toSessionId: string) => void;
}

export const useSessionStore = create<SessionStoreState & SessionStoreActions>()(
  immer((set, get) => ({
    // ── State ──────────────────────────────────────────────────────────────

    slots: {},
    aliases: {},
    activeSessionId: null,

    // ── Internal helpers ──────────────────────────────────────────────────

    _resolveSessionId(sessionId: string | null | undefined): string | null {
      if (!sessionId) return null;
      const aliases = get().aliases;
      let resolved = sessionId;
      const visited = new Set<string>();
      while (aliases[resolved] !== undefined && !visited.has(resolved)) {
        visited.add(resolved);
        resolved = aliases[resolved];
      }
      return resolved;
    },

    _getSlot(sessionId: string): SessionSlot {
      const resolved = get()._resolveSessionId(sessionId) ?? sessionId;
      const slots = get().slots;
      if (!slots[resolved]) {
        set((draft) => {
          draft.slots[resolved] = createEmptySlot();
        });
      }
      return get().slots[resolved];
    },

    // ── Public methods ────────────────────────────────────────────────────

    setActiveSession(sessionId: string | null) {
      const resolved = get()._resolveSessionId(sessionId) ?? sessionId;
      set((draft) => {
        draft.activeSessionId = resolved;
      });
    },

    has(sessionId: string): boolean {
      const resolved = get()._resolveSessionId(sessionId) ?? sessionId;
      return get().slots[resolved] !== undefined;
    },

    getMessages(sessionId: string): NormalizedMessage[] {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;
      return state.slots[resolved]?.merged ?? [];
    },

    async fetchFromServer(sessionId, opts = {}) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;

      set((draft) => {
        if (!draft.slots[resolved]) draft.slots[resolved] = createEmptySlot();
        draft.slots[resolved].status = 'loading';
      });

      try {
        const params = new URLSearchParams();
        if (opts.limit !== null && opts.limit !== undefined) {
          params.append('limit', String(opts.limit));
          params.append('offset', String(opts.offset ?? 0));
        }

        const qs = params.toString();
        const url = `/api/providers/sessions/${encodeURIComponent(resolved)}/messages${qs ? `?${qs}` : ''}`;
        const response = await authenticatedFetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const messages: NormalizedMessage[] = data.messages || [];

        set((draft) => {
          const slot = draft.slots[resolved];
          slot.serverMessages = messages;
          slot.total = data.total ?? messages.length;
          slot.hasMore = Boolean(data.hasMore);
          slot.offset = (opts.offset ?? 0) + messages.length;
          slot.fetchedAt = Date.now();
          slot.status = 'idle';
          if (data.tokenUsage) slot.tokenUsage = data.tokenUsage;
          recomputeMergedIfNeeded(slot);
        });

        return get().slots[resolved];
      } catch (error) {
        console.error(`[SessionStore] fetch failed for ${resolved}:`, error);
        set((draft) => {
          if (draft.slots[resolved]) draft.slots[resolved].status = 'error';
        });
        return get().slots[resolved];
      }
    },

    async fetchMore(sessionId, opts = {}) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;
      const slot = state.slots[resolved];
      if (!slot || !slot.hasMore) return slot;

      const params = new URLSearchParams();
      const limit = opts.limit ?? 20;
      params.append('limit', String(limit));
      params.append('offset', String(slot.offset));

      const qs = params.toString();
      const url = `/api/providers/sessions/${encodeURIComponent(resolved)}/messages${qs ? `?${qs}` : ''}`;

      try {
        const response = await authenticatedFetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const olderMessages: NormalizedMessage[] = data.messages || [];

        set((draft) => {
          const s = draft.slots[resolved];
          // Prepend older messages (they're earlier in the conversation)
          s.serverMessages = [...olderMessages, ...s.serverMessages];
          s.hasMore = Boolean(data.hasMore);
          s.offset = s.offset + olderMessages.length;
          recomputeMergedIfNeeded(s);
        });

        return get().slots[resolved];
      } catch (error) {
        console.error(`[SessionStore] fetchMore failed for ${resolved}:`, error);
        return get().slots[resolved];
      }
    },

    appendRealtime(sessionId, msg) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;

      set((draft) => {
        if (!draft.slots[resolved]) draft.slots[resolved] = createEmptySlot();
        const slot = draft.slots[resolved];
        const normalized = msg.sessionId === resolved ? msg : { ...msg, sessionId: resolved };
        let updated = [...slot.realtimeMessages, normalized];
        if (updated.length > MAX_REALTIME_MESSAGES) {
          updated = updated.slice(-MAX_REALTIME_MESSAGES);
        }
        slot.realtimeMessages = updated;
        recomputeMergedIfNeeded(slot);
      });
    },

    async refreshFromServer(sessionId, _opts = {}) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;

      try {
        const url = `/api/providers/sessions/${encodeURIComponent(resolved)}/messages`;
        const response = await authenticatedFetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        set((draft) => {
          if (!draft.slots[resolved]) draft.slots[resolved] = createEmptySlot();
          const slot = draft.slots[resolved];
          slot.serverMessages = data.messages || [];
          slot.total = data.total ?? slot.serverMessages.length;
          slot.hasMore = Boolean(data.hasMore);
          slot.fetchedAt = Date.now();
          slot.realtimeMessages = [];
          recomputeMergedIfNeeded(slot);
        });
      } catch (error) {
        console.error(`[SessionStore] refresh failed for ${resolved}:`, error);
      }
    },

    isStale(sessionId: string): boolean {
      const resolved = get()._resolveSessionId(sessionId) ?? sessionId;
      const slot = get().slots[resolved];
      if (!slot) return true;
      return Date.now() - slot.fetchedAt > STALE_THRESHOLD_MS;
    },

    updateStreaming(sessionId, accumulatedText, msgProvider) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;

      set((draft) => {
        if (!draft.slots[resolved]) draft.slots[resolved] = createEmptySlot();
        const slot = draft.slots[resolved];
        const streamId = `__streaming_${resolved}`;
        const msg: NormalizedMessage = {
          id: streamId,
          sessionId: resolved,
          timestamp: new Date().toISOString(),
          provider: msgProvider,
          kind: 'stream_delta',
          content: accumulatedText,
        };
        const idx = slot.realtimeMessages.findIndex(m => m.id === streamId);
        if (idx >= 0) {
          slot.realtimeMessages = [...slot.realtimeMessages];
          slot.realtimeMessages[idx] = msg;
        } else {
          slot.realtimeMessages = [...slot.realtimeMessages, msg];
        }
        recomputeMergedIfNeeded(slot);
      });
    },

    finalizeStreaming(sessionId) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;

      set((draft) => {
        const slot = draft.slots[resolved];
        if (!slot) return;
        const streamId = `__streaming_${resolved}`;
        const idx = slot.realtimeMessages.findIndex(m => m.id === streamId);
        if (idx >= 0) {
          slot.realtimeMessages = [...slot.realtimeMessages];
          slot.realtimeMessages[idx] = {
            ...slot.realtimeMessages[idx],
            id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            kind: 'text',
            role: 'assistant',
          };
          recomputeMergedIfNeeded(slot);
        }
      });
    },

    clearAllMessages(sessionId) {
      const state = get();
      const resolved = state._resolveSessionId(sessionId) ?? sessionId;

      set((draft) => {
        const slot = draft.slots[resolved];
        if (slot) {
          slot.serverMessages = [];
          slot.realtimeMessages = [];
          slot.offset = 0;
          slot.total = 0;
          slot.hasMore = false;
          slot.fetchedAt = 0;
          recomputeMergedIfNeeded(slot);
        }
      });
    },

    replaceSessionId(fromSessionId, toSessionId) {
      const state = get();
      const resolvedFrom = state._resolveSessionId(fromSessionId) ?? fromSessionId;
      const resolvedTo = state._resolveSessionId(toSessionId) ?? toSessionId;

      if (resolvedFrom === resolvedTo) {
        set((draft) => {
          draft.aliases[fromSessionId] = resolvedTo;
        });
        return;
      }

      set((draft) => {
        const fromSlot = draft.slots[resolvedFrom];
        let targetSlot = draft.slots[resolvedTo];

        if (!targetSlot) {
          targetSlot = createEmptySlot();
          draft.slots[resolvedTo] = targetSlot;
        }

        if (fromSlot) {
          const migratedServer = fromSlot.serverMessages.map((m) =>
            rewriteMessageSessionId(m, resolvedFrom, resolvedTo),
          );
          const migratedRealtime = fromSlot.realtimeMessages.map((m) =>
            rewriteMessageSessionId(m, resolvedFrom, resolvedTo),
          );

          targetSlot.serverMessages = mergeMessagesById(targetSlot.serverMessages, migratedServer);
          targetSlot.realtimeMessages = mergeMessagesById(targetSlot.realtimeMessages, migratedRealtime);
          if (targetSlot.realtimeMessages.length > MAX_REALTIME_MESSAGES) {
            targetSlot.realtimeMessages = targetSlot.realtimeMessages.slice(-MAX_REALTIME_MESSAGES);
          }
          targetSlot.status =
            fromSlot.status === 'error'
              ? 'error'
              : fromSlot.status === 'streaming' || targetSlot.status === 'streaming'
                ? 'streaming'
                : fromSlot.status === 'loading' || targetSlot.status === 'loading'
                  ? 'loading'
                  : targetSlot.status;
          targetSlot.fetchedAt = Math.max(targetSlot.fetchedAt, fromSlot.fetchedAt, Date.now());
          targetSlot.total = Math.max(
            targetSlot.total,
            fromSlot.total,
            targetSlot.serverMessages.length,
            targetSlot.realtimeMessages.length,
          );
          targetSlot.hasMore = targetSlot.hasMore || fromSlot.hasMore;
          targetSlot.offset = Math.max(targetSlot.offset, fromSlot.offset);
          targetSlot.tokenUsage = targetSlot.tokenUsage ?? fromSlot.tokenUsage;
          recomputeMergedIfNeeded(targetSlot);

          delete draft.slots[resolvedFrom];
        }

        draft.aliases[resolvedFrom] = resolvedTo;
        draft.aliases[fromSessionId] = resolvedTo;

        // Update transitive aliases
        for (const alias of Object.keys(draft.aliases)) {
          if (draft.aliases[alias] === resolvedFrom) {
            draft.aliases[alias] = resolvedTo;
          }
        }

        if (draft.activeSessionId === resolvedFrom) {
          draft.activeSessionId = resolvedTo;
        }
      });
    },
  })),
);

export type SessionStore = ReturnType<typeof useSessionStore>;
