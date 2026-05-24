import { useCallback, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

const INITIAL_VISIBLE_MESSAGES = 100;

export interface ChatPaginationPrimitives {
  // State shared between useChatSessionState and useChatScrollPaginationState
  hasMoreMessages: boolean;
  setHasMoreMessages: (v: boolean) => void;
  totalMessages: number;
  setTotalMessages: (v: number) => void;
  visibleMessageCount: number;
  setVisibleMessageCount: Dispatch<SetStateAction<number>>;
  allMessagesLoaded: boolean;
  setAllMessagesLoaded: (v: boolean) => void;
  allMessagesLoadedRef: MutableRefObject<boolean>;
  messagesOffsetRef: MutableRefObject<number>;
  loadAllOverlayTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  loadAllFinishedTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  resetPaginationState: () => void;
}

export function useChatPaginationPrimitives(): ChatPaginationPrimitives {
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [visibleMessageCount, setVisibleMessageCount] = useState(INITIAL_VISIBLE_MESSAGES);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
  const allMessagesLoadedRef = useRef(false);
  const messagesOffsetRef = useRef(0);
  const loadAllOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadAllFinishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetPaginationState = useCallback(() => {
    messagesOffsetRef.current = 0;
    setHasMoreMessages(false);
    setTotalMessages(0);
    setVisibleMessageCount(INITIAL_VISIBLE_MESSAGES);
    setAllMessagesLoaded(false);
    allMessagesLoadedRef.current = false;
    if (loadAllOverlayTimerRef.current) {
      clearTimeout(loadAllOverlayTimerRef.current);
      loadAllOverlayTimerRef.current = null;
    }
    if (loadAllFinishedTimerRef.current) {
      clearTimeout(loadAllFinishedTimerRef.current);
      loadAllFinishedTimerRef.current = null;
    }
  }, []);

  return {
    hasMoreMessages, setHasMoreMessages,
    totalMessages, setTotalMessages,
    visibleMessageCount, setVisibleMessageCount,
    allMessagesLoaded, setAllMessagesLoaded,
    allMessagesLoadedRef,
    messagesOffsetRef,
    loadAllOverlayTimerRef,
    loadAllFinishedTimerRef,
    resetPaginationState,
  };
}
