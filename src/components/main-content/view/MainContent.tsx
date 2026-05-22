import React, { useEffect } from 'react';

import ChatInterface from '../../chat/view/ChatInterface';
import StandaloneShell from '../../standalone-shell/view/StandaloneShell';
import PluginTabContent from '../../plugins/view/PluginTabContent';
import type { MainContentProps } from '../types/types';
import { usePaletteOpsRegister } from '../../../contexts/PaletteOpsContext';
import { useUiPreferences } from '../../../hooks/useUiPreferences';
import EditorSidebar from '../../code-editor/view/EditorSidebar';

import ContextHeader from '../../context-header/ContextHeader';
import MainContentStateView from './subcomponents/MainContentStateView';

import ErrorBoundary from './ErrorBoundary';

function MainContent({
  selectedProject,
  selectedSession,
  activeTab,
  setActiveTab,
  ws,
  sendMessage,
  latestMessage,
  isMobile,
  onMenuClick,
  isLoading,
  onInputFocusChange,
  onSessionActive,
  onSessionInactive,
  onSessionProcessing,
  onSessionNotProcessing,
  processingSessions,
  onNavigateToSession,
  onShowSettings,
  externalMessageUpdate,
  newSessionTrigger,
  onSessionError,
  activeActivity,
  projects = [],
  onProjectSelect,
  onNewSession,
  editingFile,
  gitPanelOpen,
  editorWidth,
  editorExpanded,
  hasManualWidth,
  resizeHandleRef,
  onFileOpen,
  onCloseEditor,
  onCloseGitPanel,
  onToggleEditorExpand,
  onResizeStart,
}: MainContentProps) {
  const { preferences } = useUiPreferences();
  const { autoExpandTools, showRawParameters, showThinking, autoScrollToBottom, sendByCtrlEnter } = preferences;

  usePaletteOpsRegister({
    openFile: (filePath: string) => {
      onFileOpen(filePath);
    },
  });

  if (isLoading) {
    return <MainContentStateView mode="loading" isMobile={isMobile} onMenuClick={onMenuClick} activeActivity={activeActivity} />;
  }

  if (!selectedProject) {
    return <MainContentStateView mode="empty" isMobile={isMobile} onMenuClick={onMenuClick} activeActivity={activeActivity} />;
  }

  return (
    <div className="flex h-full flex-col">
      <ContextHeader
        selectedProject={selectedProject}
        selectedSession={selectedSession}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        projects={projects}
        isMobile={isMobile}
        onProjectSelect={onProjectSelect ?? (() => {})}
        onSessionSelect={(session) => onNavigateToSession(session.id)}
        onNewSession={onNewSession ?? (() => {})}
        onMenuClick={onMenuClick}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className={`flex min-h-0 min-w-[200px] flex-col overflow-hidden ${editorExpanded ? 'hidden' : ''} flex-1`}>
          <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            <ErrorBoundary showDetails>
              <ChatInterface
                selectedProject={selectedProject}
                selectedSession={selectedSession}
                ws={ws}
                sendMessage={sendMessage}
                latestMessage={latestMessage}
                onFileOpen={onFileOpen}
                onInputFocusChange={onInputFocusChange}
                onSessionActive={onSessionActive}
                onSessionInactive={onSessionInactive}
                onSessionProcessing={onSessionProcessing}
                onSessionNotProcessing={onSessionNotProcessing}
                processingSessions={processingSessions}
                onNavigateToSession={onNavigateToSession}
                onShowSettings={onShowSettings}
                onSessionError={onSessionError}
                autoExpandTools={autoExpandTools}
                showRawParameters={showRawParameters}
                showThinking={showThinking}
                autoScrollToBottom={autoScrollToBottom}
                sendByCtrlEnter={sendByCtrlEnter}
                externalMessageUpdate={externalMessageUpdate}
                newSessionTrigger={newSessionTrigger}
                />
            </ErrorBoundary>
          </div>

          {activeTab === 'shell' && (
            <div className="h-full w-full overflow-hidden">
              <StandaloneShell
                project={selectedProject}
                session={selectedSession}
                showHeader={false}
                isActive={activeTab === 'shell'}
              />
            </div>
          )}

          <div className={`h-full overflow-hidden ${activeTab === 'preview' ? 'block' : 'hidden'}`} />

          {activeTab.startsWith('plugin:') && (
            <div className="h-full overflow-hidden">
              <PluginTabContent
                pluginName={activeTab.replace('plugin:', '')}
                selectedProject={selectedProject}
                selectedSession={selectedSession}
              />
            </div>
          )}
        </div>

        <EditorSidebar
          editingFile={editingFile}
          gitPanelOpen={gitPanelOpen}
          selectedProject={selectedProject}
          isMobile={isMobile}
          editorExpanded={editorExpanded}
          editorWidth={editorWidth}
          hasManualWidth={hasManualWidth}
          resizeHandleRef={resizeHandleRef}
          onResizeStart={onResizeStart}
          onCloseEditor={onCloseEditor}
          onToggleEditorExpand={onToggleEditorExpand}
          onFileOpen={onFileOpen}
          projectPath={selectedProject.path}
        />
      </div>
    </div>
  );
}

export default React.memo(MainContent);
