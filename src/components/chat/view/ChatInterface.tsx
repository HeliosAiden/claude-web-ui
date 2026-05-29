import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProviderAuthStatus } from '../../provider-auth/hooks/useProviderAuthStatus';
import PermissionContext from '../../../contexts/PermissionContext';
import ChatSessionContext from '../../../contexts/ChatSessionContext';
import ChatProviderContext from '../../../contexts/ChatProviderContext';
import { QuickSettingsPanel } from '../../quick-settings-panel';
import type { ChatInterfaceProps, Provider  } from '../types/types';
import type { LLMProvider } from '../../../types/app';
import { useChatProviderState } from '../hooks/useChatProviderState';
import { useChatSessionState } from '../hooks/useChatSessionState';
import { useChatScrollPaginationState } from '../hooks/useChatScrollPaginationState';
import { useChatPaginationPrimitives } from '../hooks/useChatPaginationPrimitives';
import { useChatRealtimeHandlers } from '../hooks/useChatRealtimeHandlers';
import { useChatComposerState } from '../hooks/useChatComposerState';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useMobileStatusStore } from '../../../stores/useMobileStatusStore';

import ChatMessagesPane from './subcomponents/ChatMessagesPane';
import ChatComposer from './subcomponents/ChatComposer';
import TemplatePlaceholderDialog from './subcomponents/TemplatePlaceholderDialog';


type PendingViewSession = {
  sessionId: string | null;
  startedAt: number;
};

function ChatInterface({
  isMobile = false,
  selectedProject,
  selectedSession,
  ws,
  sendMessage,
  latestMessage,
  onFileOpen,
  onInputFocusChange,
  onSessionActive,
  onSessionInactive,
  onSessionProcessing,
  onSessionNotProcessing,
  processingSessions,
  onNavigateToSession,
  onShowSettings,
  onSessionError,
  autoExpandTools,
  showRawParameters,
  showThinking,
  autoScrollToBottom,
  sendByCtrlEnter,
  externalMessageUpdate,
  newSessionTrigger,
}: ChatInterfaceProps) {
  const { t } = useTranslation('chat');

  const streamTimerRef = useRef<number | null>(null);
  const accumulatedStreamRef = useRef('');
  const pendingViewSessionRef = useRef<PendingViewSession | null>(null);

  const resetStreamingState = useCallback(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    accumulatedStreamRef.current = '';
  }, []);

  const {
    provider,
    setProvider,
    cursorModel,
    setCursorModel,
    claudeModel,
    setClaudeModel,
    codexModel,
    setCodexModel,
    geminiModel,
    setGeminiModel,
    permissionMode,
    pendingPermissionRequests,
    setPendingPermissionRequests,
    cyclePermissionMode,
    fccModels,
  } = useChatProviderState({
    selectedSession,
  });

  const {
    providerAuthStatus,
    refreshProviderAuthStatuses,
  } = useProviderAuthStatus();

  useEffect(() => {
    refreshProviderAuthStatuses();
  }, [refreshProviderAuthStatuses]);

  const pagination = useChatPaginationPrimitives();

  // Session state — messages, bookmarks, streaming status, tokens
  const sessionState = useChatSessionState({
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
  });

  // Scroll and pagination state
  const scrollState = useChatScrollPaginationState({
    selectedSession,
    selectedProject,
    chatMessagesLength: sessionState.chatMessages.length,
    autoScrollToBottom,
    pagination,
  });

  const {
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
  } = sessionState;

  const {
    scrollContainerRef,
    scrollToBottom,
    scrollToBottomAndReset,
    handleScroll,
    isUserScrolledUp,
    setIsUserScrolledUp,
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
  } = scrollState;

  // Compute visible messages from chatMessages + visibleMessageCount
  const visibleMessages = useMemo(() => {
    if (chatMessages.length <= visibleMessageCount) return chatMessages;
    return chatMessages.slice(-visibleMessageCount);
  }, [chatMessages, visibleMessageCount]);

  const providerContextValue = useMemo(() => ({
    provider, setProvider, cursorModel, setCursorModel,
    claudeModel, setClaudeModel, codexModel, setCodexModel,
    geminiModel, setGeminiModel, fccModels, providerAuthStatus,
    permissionMode, cyclePermissionMode,
  }), [
    provider, setProvider, cursorModel, setCursorModel,
    claudeModel, setClaudeModel, codexModel, setCodexModel,
    geminiModel, setGeminiModel, fccModels, providerAuthStatus,
    permissionMode, cyclePermissionMode,
  ]);

  const sessionContextValue = useMemo(() => ({
    chatMessages, selectedSession, currentSessionId, selectedProject,
    bookmarkedMessageUuids, pinnedBookmarks, createDiff,
    scrollContainerRef, handleScroll, isUserScrolledUp,
    isLoadingSessionMessages, isLoadingMoreMessages, hasMoreMessages,
    totalMessages, visibleMessageCount, loadEarlierMessages,
    loadAllMessages, allMessagesLoaded, isLoadingAllMessages,
    loadAllJustFinished, showLoadAllOverlay,
  }), [
    chatMessages, selectedSession, currentSessionId, selectedProject,
    bookmarkedMessageUuids, pinnedBookmarks, createDiff,
    scrollContainerRef, handleScroll, isUserScrolledUp,
    isLoadingSessionMessages, isLoadingMoreMessages, hasMoreMessages,
    totalMessages, visibleMessageCount, loadEarlierMessages,
    loadAllMessages, allMessagesLoaded, isLoadingAllMessages,
    loadAllJustFinished, showLoadAllOverlay,
  ]);

  const {
    input,
    setInput,
    textareaRef,
    inputHighlightRef,
    isTextareaExpanded,
    thinkingMode,
    setThinkingMode,
    slashCommandsCount,
    filteredCommands,
    frequentCommands,
    commandQuery,
    showCommandMenu,
    selectedCommandIndex,
    resetCommandMenuState,
    handleCommandSelect,
    handleToggleCommandMenu,
    showFileDropdown,
    filteredFiles,
    selectedFileIndex,
    renderInputWithMentions,
    selectFile,
    attachedImages,
    setAttachedImages,
    uploadingImages,
    imageErrors,
    attachedFiles,
    setAttachedFiles,
    uploadingFiles,
    fileErrors,
    getRootProps,
    getInputProps,
    isDragActive,
    openImagePicker,
    openFilePicker,
    handleSubmit,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    handleTextareaClick,
    handleTextareaInput,
    syncInputOverlayScroll,
    handleClearInput,
    handleAbortSession,
    handlePermissionDecision,
    handleGrantToolPermission,
    handleInputFocusChange,
    isInputFocused,
  } = useChatComposerState({
    selectedProject,
    selectedSession,
    currentSessionId,
    provider,
    permissionMode,
    cyclePermissionMode,
    cursorModel,
    claudeModel,
    codexModel,
    geminiModel,
    isLoading,
    canAbortSession,
    tokenBudget,
    sendMessage,
    sendByCtrlEnter,
    onSessionActive,
    onSessionProcessing,
    onInputFocusChange,
    onFileOpen,
    onShowSettings,
    pendingViewSessionRef,
    scrollToBottom,
    addMessage,
    clearMessages,
    rewindMessages,
    setIsLoading,
    setCanAbortSession,
    setClaudeStatus,
    setIsUserScrolledUp,
    setPendingPermissionRequests,
  });

  const [pendingTemplate, setPendingTemplate] = useState<{
    content: string;
  } | null>(null);

  // On WebSocket reconnect, re-fetch the current session's messages from the server
  // so missed streaming events are shown. Also reset isLoading.
  const handleWebSocketReconnect = useCallback(async () => {
    if (!selectedProject || !selectedSession) return;
    const providerVal = (localStorage.getItem('selected-provider') as LLMProvider) || 'claude';
    await useSessionStore.getState().refreshFromServer(selectedSession.id, {
      provider: (selectedSession.__provider || providerVal) as LLMProvider,
      // Use DB projectId; legacy folder-derived projectName is no longer accepted here.
      projectId: selectedProject.projectId,
      projectPath: selectedProject.fullPath || selectedProject.path || '',
    });
    setIsLoading(false);
    setCanAbortSession(false);
  }, [selectedProject, selectedSession, setIsLoading, setCanAbortSession]);

  // When the Shell PTY takes over a session, switch the chat to follower
  // mode so both interfaces show the same session.
  const handleSessionPtyOwned = useCallback((sessionId: string) => {
    sendMessage({
      type: 'follow-session',
      sessionId,
      options: {
        cwd: selectedProject?.fullPath || selectedProject?.path || '',
      },
    });
  }, [sendMessage, selectedProject]);

  useChatRealtimeHandlers({
    latestMessage,
    provider,
    selectedSession,
    currentSessionId,
    setCurrentSessionId,
    setIsLoading,
    setCanAbortSession,
    setClaudeStatus,
    setTokenBudget,
    setPendingPermissionRequests,
    pendingViewSessionRef,
    streamTimerRef,
    accumulatedStreamRef,
    onSessionInactive,
    onSessionProcessing,
    onSessionNotProcessing,
    onSessionPtyOwned: handleSessionPtyOwned,
    onNavigateToSession,
    onSessionError,
    onWebSocketReconnect: handleWebSocketReconnect,
  });

  useEffect(() => {
    if (!isLoading || !canAbortSession) {
      return;
    }

    const handleGlobalEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat || event.defaultPrevented) {
        return;
      }

      event.preventDefault();
      handleAbortSession();
    };

    document.addEventListener('keydown', handleGlobalEscape, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleGlobalEscape, { capture: true });
    };
  }, [canAbortSession, handleAbortSession, isLoading]);

  // Sync status state into the mobile bridge store so MobileClaudeStatusBar
  // can display it from outside the ChatInterface component tree.
  useEffect(() => {
    if (!isMobile) return;
    useMobileStatusStore.getState().sync({
      isLoading,
      status: claudeStatus,
      provider,
      onAbort: isLoading && canAbortSession ? handleAbortSession : null,
    });
  }, [isMobile, isLoading, claudeStatus, provider, canAbortSession, handleAbortSession]);

  useEffect(() => {
    return () => {
      resetStreamingState();
    };
  }, [resetStreamingState]);

  const handleInsertTemplateWithPlaceholders = useCallback(
    (content: string) => {
      const placeholderRegex = /\{\{(\w+)\}\}/g;
      if (placeholderRegex.test(content)) {
        placeholderRegex.lastIndex = 0;
        setPendingTemplate({ content });
      } else {
        setInput(content);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    },
    [setInput, textareaRef],
  );

  const permissionContextValue = useMemo(() => ({
    pendingPermissionRequests,
    handlePermissionDecision,
  }), [pendingPermissionRequests, handlePermissionDecision]);

  if (!selectedProject) {
    const selectedProviderLabel =
      provider === 'cursor'
        ? t('messageTypes.cursor')
        : provider === 'codex'
          ? t('messageTypes.codex')
          : provider === 'gemini'
            ? t('messageTypes.gemini')
            : t('messageTypes.claude');

    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">
            {t('projectSelection.startChatWithProvider', {
              provider: selectedProviderLabel,
              defaultValue: 'Select a project to start chatting with {{provider}}',
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatProviderContext.Provider value={providerContextValue}>
    <ChatSessionContext.Provider value={sessionContextValue}>
    <PermissionContext.Provider value={permissionContextValue}>
      <div className="flex h-full flex-col">
        <ChatMessagesPane
          textareaRef={textareaRef}
          setInput={setInput}
          visibleMessages={visibleMessages}
          onFileOpen={onFileOpen}
          onShowSettings={onShowSettings}
          onGrantToolPermission={handleGrantToolPermission}
          autoExpandTools={autoExpandTools}
          showRawParameters={showRawParameters}
          showThinking={showThinking}
        />

        {!isMobile && (
          <ChatComposer
            pendingPermissionRequests={pendingPermissionRequests}
            handlePermissionDecision={handlePermissionDecision}
            handleGrantToolPermission={handleGrantToolPermission}
            claudeStatus={claudeStatus}
            isLoading={isLoading}
            onAbortSession={handleAbortSession}
            thinkingMode={thinkingMode}
            setThinkingMode={setThinkingMode}
            tokenBudget={tokenBudget}
            slashCommandsCount={slashCommandsCount}
            onToggleCommandMenu={handleToggleCommandMenu}
            hasInput={Boolean(input.trim())}
            onClearInput={handleClearInput}
            isUserScrolledUp={isUserScrolledUp}
            hasMessages={chatMessages.length > 0}
            onScrollToBottom={scrollToBottomAndReset}
            onSubmit={handleSubmit}
            isDragActive={isDragActive}
            attachedImages={attachedImages}
            onRemoveImage={(index) =>
              setAttachedImages((previous) =>
                previous.filter((_, currentIndex) => currentIndex !== index),
              )
            }
            uploadingImages={uploadingImages}
            imageErrors={imageErrors}
            attachedFiles={attachedFiles}
            onRemoveFile={(index) =>
              setAttachedFiles((previous) =>
                previous.filter((_, currentIndex) => currentIndex !== index),
              )
            }
            uploadingFiles={uploadingFiles}
            fileErrors={fileErrors}
            openFilePicker={openFilePicker}
            showFileDropdown={showFileDropdown}
            filteredFiles={filteredFiles}
            selectedFileIndex={selectedFileIndex}
            onSelectFile={selectFile}
            filteredCommands={filteredCommands}
            selectedCommandIndex={selectedCommandIndex}
            onCommandSelect={handleCommandSelect}
            onCloseCommandMenu={resetCommandMenuState}
            isCommandMenuOpen={showCommandMenu}
            frequentCommands={commandQuery ? [] : frequentCommands}
            getRootProps={getRootProps as (...args: unknown[]) => Record<string, unknown>}
            getInputProps={getInputProps as (...args: unknown[]) => Record<string, unknown>}
            openImagePicker={openImagePicker}
            inputHighlightRef={inputHighlightRef}
            renderInputWithMentions={renderInputWithMentions}
            textareaRef={textareaRef}
            input={input}
            onInputChange={handleInputChange}
            onTextareaClick={handleTextareaClick}
            onTextareaKeyDown={handleKeyDown}
            onTextareaPaste={handlePaste}
            onTextareaScrollSync={syncInputOverlayScroll}
            onTextareaInput={handleTextareaInput}
            onInputFocusChange={handleInputFocusChange}
            placeholder={t('input.placeholder', {
              provider:
                provider === 'cursor'
                  ? t('messageTypes.cursor')
                  : provider === 'codex'
                    ? t('messageTypes.codex')
                    : provider === 'gemini'
                      ? t('messageTypes.gemini')
                      : t('messageTypes.claude'),
            })}
            isTextareaExpanded={isTextareaExpanded}
            sendByCtrlEnter={sendByCtrlEnter}
            onInsertTemplate={handleInsertTemplateWithPlaceholders}
          />
        )}
      </div>

      {!isMobile && <QuickSettingsPanel />}

      <TemplatePlaceholderDialog
        open={pendingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTemplate(null);
        }}
        content={pendingTemplate?.content ?? ''}
        onConfirm={(substitutedContent) => {
          setInput(substitutedContent);
          requestAnimationFrame(() => {
            textareaRef.current?.focus();
          });
          setPendingTemplate(null);
        }}
      />
    </PermissionContext.Provider>
    </ChatSessionContext.Provider>
    </ChatProviderContext.Provider>
  );
}

export default React.memo(ChatInterface);
