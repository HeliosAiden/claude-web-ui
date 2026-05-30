import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useSessionStore } from '../../../stores/useSessionStore';
import type { Project, ProjectSession, LLMProvider } from '../../../types/app';

import type { ChatPaginationPrimitives } from './useChatPaginationPrimitives';

interface ScrollRestoreState {
  height: number;
  top: number;
}

export interface UseChatScrollPaginationStateArgs {
  selectedSession: ProjectSession | null;
  selectedProject: Project | null;
  chatMessagesLength: number;
  autoScrollToBottom?: boolean;
  pagination: ChatPaginationPrimitives;
}

export function useChatScrollPaginationState({
  selectedSession,
  selectedProject,
  chatMessagesLength,
  autoScrollToBottom,
  pagination,
}: UseChatScrollPaginationStateArgs) {
  const {
    hasMoreMessages,
    totalMessages,
    visibleMessageCount,
    allMessagesLoaded,
    allMessagesLoadedRef,
    messagesOffsetRef,
    loadAllOverlayTimerRef,
    loadAllFinishedTimerRef,
    setHasMoreMessages,
    setTotalMessages,
    setVisibleMessageCount,
    setAllMessagesLoaded,
  } = pagination;

  // Local pagination state (not shared with session hook)
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [isLoadingAllMessages, setIsLoadingAllMessages] = useState(false);
  const [loadAllJustFinished, setLoadAllJustFinished] = useState(false);
  const [showLoadAllOverlay, setShowLoadAllOverlay] = useState(false);

  // Scroll state (owned by this hook only)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Internal refs (scroll-specific, not shared)
  const isLoadingMoreRef = useRef(false);
  const topLoadLockRef = useRef(false);
  const pendingScrollRestoreRef = useRef<ScrollRestoreState | null>(null);
  const pendingInitialScrollRef = useRef(true);
  const scrollPositionRef = useRef({ height: 0, top: 0 });
  const isUserScrolledUpRef = useRef(false);

  // Scroll callbacks
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  const scrollToBottomAndReset = useCallback(() => {
    scrollToBottom();
    if (allMessagesLoaded) {
      setVisibleMessageCount(100);
      setAllMessagesLoaded(false);
      allMessagesLoadedRef.current = false;
    }
  }, [allMessagesLoaded, scrollToBottom, allMessagesLoadedRef, setAllMessagesLoaded, setVisibleMessageCount]);

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Pagination: load older messages (infinite scroll upward)
  const loadOlderMessages = useCallback(
    async (container: HTMLDivElement) => {
      if (!container || isLoadingMoreRef.current || isLoadingMoreMessages) return false;
      if (allMessagesLoadedRef.current) return false;
      if (!hasMoreMessages || !selectedSession || !selectedProject) return false;

      const sessionProvider = selectedSession.__provider || 'claude';

      isLoadingMoreRef.current = true;
      setIsLoadingMoreMessages(true);
      const previousScrollHeight = container.scrollHeight;
      const previousScrollTop = container.scrollTop;

      try {
        const slot = await useSessionStore.getState().fetchMore(selectedSession.id, {
          provider: sessionProvider as LLMProvider,
          projectId: selectedProject.projectId,
          projectPath: selectedProject.fullPath || selectedProject.path || '',
          limit: 20,
        });
        if (!slot || slot.serverMessages.length === 0) return false;

        pendingScrollRestoreRef.current = { height: previousScrollHeight, top: previousScrollTop };
        setHasMoreMessages(slot.hasMore);
        setTotalMessages(slot.total);
        setVisibleMessageCount((prev) => prev + 20);
        return true;
      } finally {
        isLoadingMoreRef.current = false;
        setIsLoadingMoreMessages(false);
      }
    },
    [
      hasMoreMessages,
      isLoadingMoreMessages,
      selectedProject,
      selectedSession,
      allMessagesLoadedRef,
      setHasMoreMessages,
      setTotalMessages,
      setVisibleMessageCount,
    ],
  );

  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nearBottom = isNearBottom();
    const scrolledUp = !nearBottom;
    setIsUserScrolledUp(scrolledUp);
    isUserScrolledUpRef.current = scrolledUp;

    if (!allMessagesLoadedRef.current) {
      const scrolledNearTop = container.scrollTop < 100;
      if (!scrolledNearTop) { topLoadLockRef.current = false; return; }
      if (topLoadLockRef.current) {
        if (container.scrollTop > 20) topLoadLockRef.current = false;
        return;
      }
      const didLoad = await loadOlderMessages(container);
      if (didLoad) topLoadLockRef.current = true;
    }
  }, [isNearBottom, loadOlderMessages, allMessagesLoadedRef]);

  // Scroll restoration after loading older messages
  useLayoutEffect(() => {
    if (!pendingScrollRestoreRef.current || !scrollContainerRef.current) return;
    const { height, top } = pendingScrollRestoreRef.current;
    const container = scrollContainerRef.current;
    const newScrollHeight = container.scrollHeight;
    container.scrollTop = top + Math.max(newScrollHeight - height, 0);
    pendingScrollRestoreRef.current = null;
  }, [chatMessagesLength]);

  // Reset scroll/pagination state on session change
  useEffect(() => {
    pendingInitialScrollRef.current = true;
    topLoadLockRef.current = false;
    pendingScrollRestoreRef.current = null;
    setIsUserScrolledUp(false);
    isUserScrolledUpRef.current = false;

    setIsLoadingMoreMessages(false);
    setIsLoadingAllMessages(false);
    setLoadAllJustFinished(false);
    setShowLoadAllOverlay(false);
  }, [selectedProject?.projectId, selectedSession?.id]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!pendingInitialScrollRef.current || !scrollContainerRef.current) return;
    if (chatMessagesLength === 0) { pendingInitialScrollRef.current = false; return; }
    pendingInitialScrollRef.current = false;
    setTimeout(() => scrollToBottom(), 200);
  }, [chatMessagesLength, scrollToBottom]);

  // Track scrollHeight changes on every layout cycle for in-place streaming growth
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || chatMessagesLength === 0) return;
    if (isLoadingMoreRef.current || isLoadingMoreMessages || pendingScrollRestoreRef.current) return;

    const prevHeight = scrollPositionRef.current.height;
    const prevTop = scrollPositionRef.current.top;
    const newHeight = container.scrollHeight;
    const newTop = container.scrollTop;

    scrollPositionRef.current = { height: newHeight, top: newTop };

    const heightDiff = newHeight - prevHeight;
    if (heightDiff <= 0) return;

    if (autoScrollToBottom) {
      if (!isUserScrolledUpRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    } else {
      if (prevTop > 0) container.scrollTop = prevTop + heightDiff;
    }
  });

  // Auto-scroll on message length changes
  useEffect(() => {
    if (!scrollContainerRef.current || chatMessagesLength === 0) return;
    if (isLoadingMoreRef.current || isLoadingMoreMessages || pendingScrollRestoreRef.current) return;

    if (autoScrollToBottom) {
      if (!isUserScrolledUp) setTimeout(() => scrollToBottom(), 50);
      return;
    }

    const container = scrollContainerRef.current;
    const prevHeight = scrollPositionRef.current.height;
    const prevTop = scrollPositionRef.current.top;
    const newHeight = container.scrollHeight;
    const heightDiff = newHeight - prevHeight;
    if (heightDiff > 0 && prevTop > 0) container.scrollTop = prevTop + heightDiff;
  }, [autoScrollToBottom, chatMessagesLength, isLoadingMoreMessages, isUserScrolledUp, scrollToBottom]);

  // Scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // "Load all" overlay effect
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoadingMoreMessages;

    if (wasLoading && !isLoadingMoreMessages && hasMoreMessages) {
      if (loadAllOverlayTimerRef.current) clearTimeout(loadAllOverlayTimerRef.current);
      setShowLoadAllOverlay(true);
      loadAllOverlayTimerRef.current = setTimeout(() => setShowLoadAllOverlay(false), 2000);
    }
    if (!hasMoreMessages && !isLoadingMoreMessages) {
      if (loadAllOverlayTimerRef.current) clearTimeout(loadAllOverlayTimerRef.current);
      setShowLoadAllOverlay(false);
    }
    return () => { if (loadAllOverlayTimerRef.current) clearTimeout(loadAllOverlayTimerRef.current); };
  }, [isLoadingMoreMessages, hasMoreMessages, loadAllOverlayTimerRef]);

  // Load all messages
  const loadAllMessages = useCallback(async () => {
    if (!selectedSession || !selectedProject) return;
    const sessionProvider = selectedSession.__provider || 'claude';

    const requestSessionId = selectedSession.id;
    allMessagesLoadedRef.current = true;
    isLoadingMoreRef.current = true;
    setIsLoadingAllMessages(true);
    setShowLoadAllOverlay(true);

    const container = scrollContainerRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    try {
      const slot = await useSessionStore.getState().fetchFromServer(requestSessionId, {
        provider: sessionProvider as LLMProvider,
        projectId: selectedProject.projectId,
        projectPath: selectedProject.fullPath || selectedProject.path || '',
        limit: null,
        offset: 0,
      });

      if (slot) {
        if (container) {
          pendingScrollRestoreRef.current = { height: previousScrollHeight, top: previousScrollTop };
        }

        setHasMoreMessages(false);
        setTotalMessages(slot.total);
        messagesOffsetRef.current = slot.total;
        setVisibleMessageCount(Infinity);
        setAllMessagesLoaded(true);

        setLoadAllJustFinished(true);
        if (loadAllFinishedTimerRef.current) clearTimeout(loadAllFinishedTimerRef.current);
        loadAllFinishedTimerRef.current = setTimeout(() => {
          setLoadAllJustFinished(false);
          setShowLoadAllOverlay(false);
        }, 1000);
      } else {
        allMessagesLoadedRef.current = false;
        setShowLoadAllOverlay(false);
      }
    } catch (error) {
      console.error('Error loading all messages:', error);
      allMessagesLoadedRef.current = false;
      setShowLoadAllOverlay(false);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingAllMessages(false);
    }
  }, [
    selectedSession, selectedProject, isLoadingMoreRef, allMessagesLoadedRef,
    messagesOffsetRef, loadAllFinishedTimerRef,
    setHasMoreMessages, setTotalMessages, setVisibleMessageCount,
    setAllMessagesLoaded, setIsLoadingAllMessages, setLoadAllJustFinished, setShowLoadAllOverlay,
  ]);

  const loadEarlierMessages = useCallback(() => {
    setVisibleMessageCount((prev) => prev + 100);
  }, [setVisibleMessageCount]);

  return {
    // Scroll
    scrollContainerRef,
    scrollToBottom,
    scrollToBottomAndReset,
    isNearBottom,
    isUserScrolledUp,
    setIsUserScrolledUp,
    handleScroll,

    // Pagination
    isLoadingMoreMessages,
    hasMoreMessages,
    totalMessages,
    visibleMessageCount,
    loadEarlierMessages,
    loadAllMessages,
    allMessagesLoaded,
    isLoadingAllMessages,
    loadAllJustFinished,
    showLoadAllOverlay,
  };
}
