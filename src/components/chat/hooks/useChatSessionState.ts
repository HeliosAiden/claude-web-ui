import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { authenticatedFetch } from '../../../utils/api';
import { useSessionStore } from '../../../stores/useSessionStore';
import type { NormalizedMessage } from '../../../stores/useSessionStore';
import type { Project, ProjectSession, LLMProvider } from '../../../types/app';
import type { ChatMessage, Provider } from '../types/types';
import { createCachedDiffCalculator, type DiffCalculator } from '../utils/messageTransforms';
import type { ChatPaginationPrimitives } from './useChatPaginationPrimitives';

import { normalizedToChatMessages } from './useChatMessages';

const EMPTY_MESSAGES: NormalizedMessage[] = [];

type PendingViewSession = {
  sessionId: string | null;
  startedAt: number;
};

interface UseChatSessionStateArgs {
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  ws: WebSocket | null;
  sendMessage: (message: unknown) => void;
  externalMessageUpdate?: number;
  newSessionTrigger?: number;
  processingSessions?: Set<string>;
  resetStreamingState: () => void;
  pendingViewSessionRef: MutableRefObject<PendingViewSession | null>;
  pagination: ChatPaginationPrimitives;
}

/* ------------------------------------------------------------------ */
/*  Helper: Convert a ChatMessage to a NormalizedMessage for the store */
/* ------------------------------------------------------------------ */

function chatMessageToNormalized(
  msg: ChatMessage,
  sessionId: string,
  provider: LLMProvider,
): NormalizedMessage | null {
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = msg.timestamp instanceof Date
    ? msg.timestamp.toISOString()
    : typeof msg.timestamp === 'number'
      ? new Date(msg.timestamp).toISOString()
      : String(msg.timestamp);
  const base = { id, sessionId, timestamp: ts, provider };

  if (msg.isToolUse) {
    return {
      ...base,
      kind: 'tool_use',
      toolName: msg.toolName,
      toolInput: msg.toolInput,
      toolId: msg.toolId || id,
    } as NormalizedMessage;
  }
  if (msg.isThinking) {
    return { ...base, kind: 'thinking', content: msg.content || '' } as NormalizedMessage;
  }
  if (msg.isInteractivePrompt) {
    return { ...base, kind: 'interactive_prompt', content: msg.content || '' } as NormalizedMessage;
  }
  if ((msg as any).isTaskNotification) {
    return {
      ...base,
      kind: 'task_notification',
      status: (msg as any).taskStatus || 'completed',
      summary: msg.content || '',
    } as NormalizedMessage;
  }
  if (msg.type === 'error') {
    return { ...base, kind: 'error', content: msg.content || '' } as NormalizedMessage;
  }
  return {
    ...base,
    kind: 'text',
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.content || '',
    images: msg.images,
    files: msg.files,
  } as NormalizedMessage;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useChatSessionState({
  selectedProject,
  selectedSession,
  ws,
  sendMessage,
  externalMessageUpdate,
  newSessionTrigger,
  processingSessions,
  resetStreamingState,
  pendingViewSessionRef,
  pagination,
}: UseChatSessionStateArgs) {
  const {
    resetPaginationState,
    allMessagesLoadedRef,
    messagesOffsetRef,
    setHasMoreMessages,
    setTotalMessages,
    setVisibleMessageCount,
    setAllMessagesLoaded,
  } = pagination;
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(selectedSession?.id || null);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [canAbortSession, setCanAbortSession] = useState(false);
  const [tokenBudget, setTokenBudget] = useState<Record<string, unknown> | null>(null);
  const [claudeStatus, setClaudeStatus] = useState<{ text: string; tokens: number; can_interrupt: boolean } | null>(null);
  const [viewHiddenCount, setViewHiddenCount] = useState(0);
  const [bookmarkedMessageUuids, setBookmarkedMessageUuids] = useState<Set<string>>(new Set());
  const [pinnedBookmarks, setPinnedBookmarks] = useState<Array<{
    messageUuid: string;
    contentSnippet: string;
    role: string;
    messageTimestamp: string;
  }>>([]);

  const [searchTarget, setSearchTarget] = useState<{ timestamp?: string; uuid?: string; snippet?: string } | null>(null);
  const searchScrollActiveRef = useRef(false);
  const isLoadingSessionRef = useRef(false);
  const previousNewSessionTriggerRef = useRef(newSessionTrigger ?? 0);
  const lastLoadedSessionKeyRef = useRef<string | null>(null);

  const createDiff = useMemo<DiffCalculator>(() => createCachedDiffCalculator(), []);

  // New session trigger reset
  useEffect(() => {
    const trigger = newSessionTrigger ?? 0;
    if (trigger === previousNewSessionTriggerRef.current) return;
    previousNewSessionTriggerRef.current = trigger;

    resetStreamingState();
    pendingViewSessionRef.current = null;
    setClaudeStatus(null);
    setCanAbortSession(false);
    setIsLoading(false);
    setCurrentSessionId(null);
    setPendingUserMessage(null);
    sessionStorage.removeItem('pendingSessionId');
    sessionStorage.removeItem('cursorSessionId');
    setTokenBudget(null);
    setViewHiddenCount(0);
    setSearchTarget(null);
    searchScrollActiveRef.current = false;
    lastLoadedSessionKeyRef.current = null;
    resetPaginationState();
  }, [newSessionTrigger, pendingViewSessionRef, resetPaginationState, resetStreamingState]);

  /* ---------------------------------------------------------------- */
  /*  Derive chatMessages from the store                              */
  /* ---------------------------------------------------------------- */

  const activeSessionId = selectedSession?.id || currentSessionId || null;
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
  const flushedPendingUserMessageRef = useRef<ChatMessage | null>(null);

  // Tell the store which session we're viewing
  const prevActiveForStoreRef = useRef<string | null>(null);
  if (activeSessionId !== prevActiveForStoreRef.current) {
    prevActiveForStoreRef.current = activeSessionId;
    useSessionStore.getState().setActiveSession(activeSessionId);
  }

  // Flush pending user message once session becomes active
  useEffect(() => {
    if (!pendingUserMessage) {
      flushedPendingUserMessageRef.current = null;
      return;
    }

    if (!activeSessionId) return;

    if (flushedPendingUserMessageRef.current === pendingUserMessage) return;

    const prov = (localStorage.getItem('selected-provider') as LLMProvider) || 'claude';
    const normalized = chatMessageToNormalized(pendingUserMessage, activeSessionId, prov);
    if (normalized) {
      useSessionStore.getState().appendRealtime(activeSessionId, normalized);
    }

    flushedPendingUserMessageRef.current = pendingUserMessage;
    setPendingUserMessage(null);
  }, [activeSessionId, pendingUserMessage]);

  const storeMessages = useSessionStore(
    (s) => {
      if (!activeSessionId) return EMPTY_MESSAGES;
      const resolved = s._resolveSessionId(activeSessionId) ?? activeSessionId;
      return s.slots[resolved]?.merged ?? EMPTY_MESSAGES;
    }
  );

  // Reset viewHiddenCount when store messages change
  const prevStoreLenRef = useRef(0);
  if (storeMessages.length !== prevStoreLenRef.current) {
    prevStoreLenRef.current = storeMessages.length;
    if (viewHiddenCount > 0) setViewHiddenCount(0);
  }

  const chatMessages = useMemo(() => {
    const all = normalizedToChatMessages(storeMessages);
    if (pendingUserMessage && all.length === 0) {
      return [pendingUserMessage];
    }
    if (viewHiddenCount > 0 && viewHiddenCount < all.length) return all.slice(0, -viewHiddenCount);
    return all;
  }, [storeMessages, viewHiddenCount, pendingUserMessage]);

  // Fetch bookmarks
  useEffect(() => {
    if (!activeSessionId) {
      setBookmarkedMessageUuids(new Set());
      setPinnedBookmarks([]);
      return;
    }

    let cancelled = false;

    authenticatedFetch(
      `/api/projects/bookmarks?sessionId=${encodeURIComponent(activeSessionId)}&limit=100`,
    )
      .then((res) => res.json())
      .then((data: { success?: boolean; data?: { bookmarks?: Array<{ messageUuid: string; contentSnippet: string; role: string; messageTimestamp: string }> } }) => {
        if (cancelled) return;
        const list = data.data?.bookmarks || [];
        const sorted = list.sort(
          (a, b) => new Date(a.messageTimestamp).getTime() - new Date(b.messageTimestamp).getTime(),
        );
        setBookmarkedMessageUuids(new Set(sorted.map((b) => b.messageUuid)));
        setPinnedBookmarks(sorted);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [activeSessionId]);

  /* ---------------------------------------------------------------- */
  /*  addMessage / clearMessages / rewindMessages                     */
  /* ---------------------------------------------------------------- */

  const addMessage = useCallback((msg: ChatMessage) => {
    if (!activeSessionId) {
      setPendingUserMessage(msg);
      return;
    }
    const prov = (localStorage.getItem('selected-provider') as LLMProvider) || 'claude';
    const normalized = chatMessageToNormalized(msg, activeSessionId, prov);
    if (normalized) {
      useSessionStore.getState().appendRealtime(activeSessionId, normalized);
    }
  }, [activeSessionId]);

  const clearMessages = useCallback(() => {
    if (!activeSessionId) return;
    useSessionStore.getState().clearAllMessages(activeSessionId);
  }, [activeSessionId]);

  const rewindMessages = useCallback((count: number) => setViewHiddenCount(count), []);

  // Main session loading effect
  useEffect(() => {
    if (!selectedSession || !selectedProject) {
      resetStreamingState();
      pendingViewSessionRef.current = null;
      setClaudeStatus(null);
      setCanAbortSession(false);
      setIsLoading(false);
      setCurrentSessionId(null);
      sessionStorage.removeItem('cursorSessionId');
      messagesOffsetRef.current = 0;
      setHasMoreMessages(false);
      setTotalMessages(0);
      setTokenBudget(null);
      lastLoadedSessionKeyRef.current = null;
      return;
    }

    const provider = (selectedSession.__provider || localStorage.getItem('selected-provider') as Provider) || 'claude';
    const sessionKey = `${selectedSession.id}:${selectedProject.projectId}:${provider}`;

    const store = useSessionStore.getState();
    if (lastLoadedSessionKeyRef.current === sessionKey && store.has(selectedSession.id) && !store.isStale(selectedSession.id)) {
      return;
    }

    const sessionChanged = currentSessionId !== null && currentSessionId !== selectedSession.id;
    if (sessionChanged) {
      resetStreamingState();
      pendingViewSessionRef.current = null;
      setClaudeStatus(null);
      setCanAbortSession(false);
    }

    // Reset pagination state
    resetPaginationState();

    if (sessionChanged) {
      setTokenBudget(null);
      setIsLoading(false);
    }

    setCurrentSessionId(selectedSession.id);
    if (provider === 'cursor') {
      sessionStorage.setItem('cursorSessionId', selectedSession.id);
    }

    if (ws) {
      sendMessage({ type: 'check-session-status', sessionId: selectedSession.id, provider });
    }

    lastLoadedSessionKeyRef.current = sessionKey;

    setIsLoadingSessionMessages(true);
    useSessionStore.getState().fetchFromServer(selectedSession.id, {
      provider: (selectedSession.__provider || provider) as LLMProvider,
      projectId: selectedProject.projectId,
      projectPath: selectedProject.fullPath || selectedProject.path || '',
      limit: 20,
      offset: 0,
    }).then(slot => {
      if (slot) {
        setHasMoreMessages(slot.hasMore);
        setTotalMessages(slot.total);
        if (slot.tokenUsage) setTokenBudget(slot.tokenUsage as Record<string, unknown>);
      }
      setIsLoadingSessionMessages(false);
    }).catch(() => {
      setIsLoadingSessionMessages(false);
    });
  }, [
    pendingViewSessionRef,
    resetPaginationState,
    resetStreamingState,
    selectedProject,
    selectedSession?.id,
    sendMessage,
    ws,
    messagesOffsetRef,
    currentSessionId,
  ]);

  // External message update
  useEffect(() => {
    if (!externalMessageUpdate || !selectedSession || !selectedProject) return;

    const reloadExternalMessages = async () => {
      try {
        // Skip store refresh during active streaming
        if (!isLoading) {
          await useSessionStore.getState().refreshFromServer(selectedSession.id, {
            provider: (selectedSession.__provider || localStorage.getItem('selected-provider') as Provider) as LLMProvider,
            projectId: selectedProject.projectId,
            projectPath: selectedProject.fullPath || selectedProject.path || '',
          });
        }
      } catch (error) {
        console.error('Error reloading messages from external update:', error);
      }
    };

    reloadExternalMessages();
  }, [
    externalMessageUpdate,
    selectedProject,
    selectedSession,
    isLoading,
  ]);

  // Search navigation target
  useEffect(() => {
    const session = selectedSession as Record<string, unknown> | null;
    const targetSnippet = session?.__searchTargetSnippet;
    const targetTimestamp = session?.__searchTargetTimestamp;
    if (typeof targetSnippet === 'string' && targetSnippet) {
      searchScrollActiveRef.current = true;
      setSearchTarget({
        snippet: targetSnippet,
        timestamp: typeof targetTimestamp === 'string' ? targetTimestamp : undefined,
      });
    }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession?.id) pendingViewSessionRef.current = null;
  }, [pendingViewSessionRef, selectedSession?.id]);

  // Scroll to search target
  useEffect(() => {
    if (!searchTarget || chatMessages.length === 0 || isLoadingSessionMessages) return;

    const target = searchTarget;
    setSearchTarget(null);

    const scrollToTarget = async () => {
      if (!allMessagesLoadedRef.current && selectedSession && selectedProject) {
        const sessionProvider = selectedSession.__provider || 'claude';
          try {
            const slot = await useSessionStore.getState().fetchFromServer(selectedSession.id, {
              provider: sessionProvider as LLMProvider,
              projectId: selectedProject.projectId,
              projectPath: selectedProject.fullPath || selectedProject.path || '',
              limit: null,
              offset: 0,
            });
            if (slot) {
              setHasMoreMessages(false);
              setTotalMessages(slot.total);
              messagesOffsetRef.current = slot.total;
              setVisibleMessageCount(Infinity);
              setAllMessagesLoaded(true);
              allMessagesLoadedRef.current = true;
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch {
            // Fall through
          }
      }
      setVisibleMessageCount(Infinity);

      const findAndScroll = (retriesLeft: number) => {
        const container = document.querySelector('.chat-messages-container') as HTMLElement | null;
        if (!container) return;

        let targetElement: Element | null = null;

        if (target.snippet) {
          const cleanSnippet = target.snippet.replace(/^\.{3}/, '').replace(/\.{3}$/, '').trim();
          const searchPhrase = cleanSnippet.slice(0, 80).toLowerCase().trim();
          if (searchPhrase.length >= 10) {
            const messageElements = container.querySelectorAll('.chat-message');
            for (const el of messageElements) {
              const text = (el.textContent || '').toLowerCase();
              if (text.includes(searchPhrase)) { targetElement = el; break; }
            }
          }
        }

        if (!targetElement && target.timestamp) {
          const targetDate = new Date(target.timestamp).getTime();
          const messageElements = container.querySelectorAll('[data-message-timestamp]');
          let closestDiff = Infinity;
          for (const el of messageElements) {
            const ts = el.getAttribute('data-message-timestamp');
            if (!ts) continue;
            const diff = Math.abs(new Date(ts).getTime() - targetDate);
            if (diff < closestDiff) { closestDiff = diff; targetElement = el; }
          }
        }

        if (targetElement) {
          targetElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          targetElement.classList.add('search-highlight-flash');
          setTimeout(() => targetElement?.classList.remove('search-highlight-flash'), 4000);
          searchScrollActiveRef.current = false;
        } else if (retriesLeft > 0) {
          setTimeout(() => findAndScroll(retriesLeft - 1), 200);
        } else {
          searchScrollActiveRef.current = false;
        }
      };

      setTimeout(() => findAndScroll(15), 150);
    };

    scrollToTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length, isLoadingSessionMessages, searchTarget]);

  // Token usage fetch
  useEffect(() => {
    if (!selectedProject || !selectedSession?.id) {
      setTokenBudget(null);
      return;
    }
    const sessionProvider = selectedSession.__provider || 'claude';
    if (sessionProvider !== 'claude') return;

    const fetchInitialTokenUsage = async () => {
      try {
        const url = `/api/projects/${selectedProject.projectId}/sessions/${selectedSession.id}/token-usage`;
        const response = await authenticatedFetch(url);
        if (response.ok) {
          setTokenBudget(await response.json());
        } else {
          setTokenBudget(null);
        }
      } catch (error) {
        console.error('Failed to fetch initial token usage:', error);
      }
    };
    fetchInitialTokenUsage();
  }, [selectedProject, selectedSession?.id, selectedSession?.__provider]);

  // Processing sessions sync
  useEffect(() => {
    const activeViewSessionId = selectedSession?.id || currentSessionId;
    if (!activeViewSessionId || !processingSessions) return;
    const shouldBeProcessing = processingSessions.has(activeViewSessionId);
    if (shouldBeProcessing && !isLoading) {
      setIsLoading(true);
      setCanAbortSession(true);
    }
  }, [currentSessionId, isLoading, processingSessions, selectedSession?.id]);

  return {
    chatMessages,
    addMessage,
    clearMessages,
    rewindMessages,
    isLoading,
    setIsLoading,
    currentSessionId,
    setCurrentSessionId,
    isLoadingSessionMessages,
    canAbortSession,
    setCanAbortSession,
    tokenBudget,
    setTokenBudget,
    claudeStatus,
    setClaudeStatus,
    createDiff,
    bookmarkedMessageUuids,
    pinnedBookmarks,
  };
}
