import { createContext, useContext } from 'react';
import type { RefObject } from 'react';

import type { ChatMessage } from '../components/chat/types/types';
import type { DiffLine } from '../components/chat/utils/messageTransforms';
import type { Project, ProjectSession } from '../types/app';

export interface ChatSessionContextValue {
  chatMessages: ChatMessage[];
  selectedSession: ProjectSession | null;
  currentSessionId: string | null;
  selectedProject: Project | null;
  bookmarkedMessageUuids: Set<string>;
  pinnedBookmarks: Array<{
    messageUuid: string;
    contentSnippet: string;
    role: string;
    messageTimestamp: string;
  }>;
  createDiff: (oldStr: string, newStr: string) => DiffLine[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  handleScroll: () => void;
  isUserScrolledUp: boolean;
  isLoadingSessionMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  totalMessages: number;
  visibleMessageCount: number;
  loadEarlierMessages: () => void;
  loadAllMessages: () => void;
  allMessagesLoaded: boolean;
  isLoadingAllMessages: boolean;
  loadAllJustFinished: boolean;
  showLoadAllOverlay: boolean;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function useChatSessionContext(): ChatSessionContextValue {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) throw new Error('useChatSessionContext must be used within ChatSessionContext.Provider');
  return ctx;
}

export default ChatSessionContext;
