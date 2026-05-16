import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { ChatMessage } from '../../types/types';
import type { Project, ProjectSession, LLMProvider } from '../../../../types/app';
import type { ProviderAuthStatusMap } from '../../../provider-auth/types';
import { getIntrinsicMessageKey } from '../../utils/messageKeys';
import { authenticatedFetch } from '../../../../utils/api';
import MessageComponent from './MessageComponent';
import ProviderSelectionEmptyState from './ProviderSelectionEmptyState';

interface ChatMessagesPaneProps {
  scrollContainerRef: RefObject<HTMLDivElement>;
  onWheel: () => void;
  onTouchMove: () => void;
  isLoadingSessionMessages: boolean;
  chatMessages: ChatMessage[];
  selectedSession: ProjectSession | null;
  currentSessionId: string | null;
  provider: LLMProvider;
  setProvider: (provider: LLMProvider) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  claudeModel: string;
  setClaudeModel: (model: string) => void;
  cursorModel: string;
  setCursorModel: (model: string) => void;
  codexModel: string;
  setCodexModel: (model: string) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
  fccModels: { value: string; label: string }[];
  providerAuthStatus: ProviderAuthStatusMap;
  tasksEnabled: boolean;
  isTaskMasterInstalled: boolean | null;
  onShowAllTasks?: (() => void) | null;
  setInput: Dispatch<SetStateAction<string>>;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  totalMessages: number;
  sessionMessagesCount: number;
  visibleMessageCount: number;
  visibleMessages: ChatMessage[];
  loadEarlierMessages: () => void;
  loadAllMessages: () => void;
  allMessagesLoaded: boolean;
  isLoadingAllMessages: boolean;
  loadAllJustFinished: boolean;
  showLoadAllOverlay: boolean;
  createDiff: any;
  onFileOpen?: (filePath: string, diffInfo?: unknown) => void;
  onShowSettings?: () => void;
  onGrantToolPermission: (suggestion: { entry: string; toolName: string }) => { success: boolean };
  autoExpandTools?: boolean;
  showRawParameters?: boolean;
  showThinking?: boolean;
  selectedProject: Project;
  bookmarkedMessageUuids: Set<string>;
  pinnedBookmarks: Array<{
    messageUuid: string;
    contentSnippet: string;
    role: string;
    messageTimestamp: string;
  }>;
}

export default function ChatMessagesPane({
  scrollContainerRef,
  onWheel,
  onTouchMove,
  isLoadingSessionMessages,
  chatMessages,
  selectedSession,
  currentSessionId,
  provider,
  setProvider,
  textareaRef,
  claudeModel,
  setClaudeModel,
  cursorModel,
  setCursorModel,
  codexModel,
  setCodexModel,
  geminiModel,
  setGeminiModel,
  fccModels,
  providerAuthStatus,
  tasksEnabled,
  isTaskMasterInstalled,
  onShowAllTasks,
  setInput,
  isLoadingMoreMessages,
  hasMoreMessages,
  totalMessages,
  sessionMessagesCount,
  visibleMessageCount,
  visibleMessages,
  loadEarlierMessages,
  loadAllMessages,
  allMessagesLoaded,
  isLoadingAllMessages,
  loadAllJustFinished,
  showLoadAllOverlay,
  createDiff,
  onFileOpen,
  onShowSettings,
  onGrantToolPermission,
  autoExpandTools,
  showRawParameters,
  showThinking,
  selectedProject,
  bookmarkedMessageUuids,
  pinnedBookmarks,
}: ChatMessagesPaneProps) {
  const { t } = useTranslation('chat');
  const messageKeyMapRef = useRef<WeakMap<ChatMessage, string>>(new WeakMap());
  const allocatedKeysRef = useRef<Set<string>>(new Set());
  const generatedMessageKeyCounterRef = useRef(0);

  // Keep keys stable across prepends so existing MessageComponent instances retain local state.
  const getMessageKey = useCallback((message: ChatMessage) => {
    const existingKey = messageKeyMapRef.current.get(message);
    if (existingKey) {
      return existingKey;
    }

    const intrinsicKey = getIntrinsicMessageKey(message);
    let candidateKey = intrinsicKey;

    if (!candidateKey || allocatedKeysRef.current.has(candidateKey)) {
      do {
        generatedMessageKeyCounterRef.current += 1;
        candidateKey = intrinsicKey
          ? `${intrinsicKey}-${generatedMessageKeyCounterRef.current}`
          : `message-generated-${generatedMessageKeyCounterRef.current}`;
      } while (allocatedKeysRef.current.has(candidateKey));
    }

    allocatedKeysRef.current.add(candidateKey);
    messageKeyMapRef.current.set(message, candidateKey);
    return candidateKey;
  }, []);

  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [pinnedCycleIndex, setPinnedCycleIndex] = useState(-1);
  const prevPinnedLenRef = useRef(0);

  useEffect(() => {
    const len = pinnedBookmarks.length;
    if (len !== prevPinnedLenRef.current) {
      prevPinnedLenRef.current = len;
      setPinnedCycleIndex(len > 0 ? len - 1 : -1);
    }
  }, [pinnedBookmarks.length]);

  const pinnedVisible = pinnedExpanded
    ? pinnedBookmarks
    : (pinnedCycleIndex >= 0 && pinnedCycleIndex < pinnedBookmarks.length
        ? [pinnedBookmarks[pinnedCycleIndex]]
        : []);

  const scrollToPinned = useCallback(async (uuid: string) => {
    // Advance cycle to next oldest pinned message (Telegram-style cycling)
    setPinnedCycleIndex((prev) => {
      if (pinnedBookmarks.length <= 1) return prev;
      const next = prev - 1;
      return next < 0 ? pinnedBookmarks.length - 1 : next;
    });

    const container = scrollContainerRef.current;
    if (!container) return;

    // Try to find the message element in the DOM
    const el = container.querySelector(`[data-message-uuid="${uuid}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('search-highlight-flash');
      setTimeout(() => el.classList.remove('search-highlight-flash'), 3000);
      return;
    }

    // Message not loaded yet — load all, then scroll after render
    if (!allMessagesLoaded) {
      await loadAllMessages();
      // Wait for DOM update
      await new Promise((resolve) => setTimeout(resolve, 400));
      const el2 = container.querySelector(`[data-message-uuid="${uuid}"]`);
      if (el2) {
        el2.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el2.classList.add('search-highlight-flash');
        setTimeout(() => el2.classList.remove('search-highlight-flash'), 3000);
      }
    }
  }, [scrollContainerRef, allMessagesLoaded, loadAllMessages, pinnedBookmarks.length]);

  const unpinPinned = useCallback(async (uuid: string) => {
    if (!currentSessionId) return;
    try {
      await authenticatedFetch('/api/projects/bookmarks/toggle', {
        method: 'POST',
        body: JSON.stringify({
          messageUuid: uuid,
          sessionId: currentSessionId,
          contentSnippet: '',
          provider: 'claude',
          role: 'assistant',
          messageTimestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Parent refetches on session change
    }
  }, [currentSessionId]);

  return (
    <div
      ref={scrollContainerRef}
      onWheel={onWheel}
      onTouchMove={onTouchMove}
      className="relative flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-0 py-3 sm:space-y-4 sm:p-4"
    >
      {isLoadingSessionMessages && chatMessages.length === 0 ? (
        <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-400" />
            <p>{t('session.loading.sessionMessages')}</p>
          </div>
        </div>
      ) : chatMessages.length === 0 ? (
        <ProviderSelectionEmptyState
          selectedSession={selectedSession}
          currentSessionId={currentSessionId}
          provider={provider}
          setProvider={setProvider}
          textareaRef={textareaRef}
          claudeModel={claudeModel}
          setClaudeModel={setClaudeModel}
          cursorModel={cursorModel}
          setCursorModel={setCursorModel}
          codexModel={codexModel}
          setCodexModel={setCodexModel}
          geminiModel={geminiModel}
          setGeminiModel={setGeminiModel}
          fccModels={fccModels}
          providerAuthStatus={providerAuthStatus}
          tasksEnabled={tasksEnabled}
          isTaskMasterInstalled={isTaskMasterInstalled}
          onShowAllTasks={onShowAllTasks}
          setInput={setInput}
        />
      ) : (
        <>
          {/* Loading indicator for older messages (hide when load-all is active) */}
          {isLoadingMoreMessages && !isLoadingAllMessages && !allMessagesLoaded && (
            <div className="py-3 text-center text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-400" />
                <p className="text-sm">{t('session.loading.olderMessages')}</p>
              </div>
            </div>
          )}

          {/* Indicator showing there are more messages to load (hide when all loaded) */}
          {hasMoreMessages && !isLoadingMoreMessages && !allMessagesLoaded && (
            <div className="border-b border-gray-200 py-2 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {totalMessages > 0 && (
                <span>
                  {t('session.messages.showingOf', { shown: sessionMessagesCount, total: totalMessages })}{' '}
                  <span className="text-xs">{t('session.messages.scrollToLoad')}</span>
                </span>
              )}
            </div>
          )}

          {/* Floating "Load all messages" overlay */}
          {(showLoadAllOverlay || isLoadingAllMessages || loadAllJustFinished) && (
            <div className="pointer-events-none sticky top-2 z-20 flex justify-center">
              {loadAllJustFinished ? (
                <div className="flex items-center space-x-2 rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-green-500">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('session.messages.allLoaded')}</span>
                </div>
              ) : (
                <button
                  className="pointer-events-auto flex items-center space-x-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-75 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={loadAllMessages}
                  disabled={isLoadingAllMessages}
                >
                  {isLoadingAllMessages && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  <span>
                    {isLoadingAllMessages
                      ? t('session.messages.loadingAll')
                      : <>{t('session.messages.loadAll')} {totalMessages > 0 && `(${totalMessages})`}</>
                    }
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Legacy message count indicator (for non-paginated view) */}
          {!hasMoreMessages && chatMessages.length > visibleMessageCount && (
            <div className="border-b border-gray-200 py-2 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {t('session.messages.showingLast', { count: visibleMessageCount, total: chatMessages.length })} |
              <button className="ml-1 text-blue-600 underline hover:text-blue-700" onClick={loadEarlierMessages}>
                {t('session.messages.loadEarlier')}
              </button>
              {' | '}
              <button
                className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={loadAllMessages}
              >
                {t('session.messages.loadAll')}
              </button>
            </div>
          )}

          {/* Pinned bookmarked messages */}
          {pinnedBookmarks.length > 0 && (
            <div className="sticky top-0 z-10 mx-3 transition-all duration-300 ease-in-out sm:mx-0">
              <div className="rounded-lg border border-yellow-200/60 bg-yellow-50/80 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300 dark:border-yellow-800/30 dark:bg-yellow-950/40">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-300">
                    <Bookmark className="h-3.5 w-3.5 fill-current" />
                    <span>Pinned</span>
                    <span className="text-yellow-500/60">({pinnedBookmarks.length})</span>
                  </div>
                  {pinnedBookmarks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPinnedExpanded((prev) => !prev)}
                      className="rounded p-0.5 text-yellow-600 transition-transform duration-200 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                    >
                      {pinnedExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-px border-t border-yellow-200/40 dark:border-yellow-800/20">
                  {pinnedVisible.map((bk) => (
                    <button
                      key={bk.messageUuid}
                      type="button"
                      onClick={() => { void scrollToPinned(bk.messageUuid); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-yellow-100/60 dark:hover:bg-yellow-900/30"
                    >
                      <span className="flex-shrink-0 rounded bg-yellow-200/60 px-1 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300">
                        {bk.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-400">
                        {bk.contentSnippet.slice(0, 80)}
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(bk.messageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void unpinPinned(bk.messageUuid);
                        }}
                        className="flex-shrink-0 rounded p-0.5 text-yellow-500/50 hover:bg-yellow-200/50 hover:text-yellow-700 dark:hover:bg-yellow-800/50 dark:hover:text-yellow-300"
                        title="Unpin"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {visibleMessages.map((message, index) => {
            const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
            return (
              <MessageComponent
                key={getMessageKey(message)}
                message={message}
                prevMessage={prevMessage}
                createDiff={createDiff}
                onFileOpen={onFileOpen}
                onShowSettings={onShowSettings}
                onGrantToolPermission={onGrantToolPermission}
                autoExpandTools={autoExpandTools}
                showRawParameters={showRawParameters}
                showThinking={showThinking}
                selectedProject={selectedProject}
                provider={provider}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

