import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder } from 'lucide-react';

import Sidebar from '../sidebar/view/Sidebar';
import MainContent from '../main-content/view/MainContent';
import DesktopWorkspaceShell from './DesktopWorkspaceShell';
import MobileWorkspaceShell from './MobileWorkspaceShell';
import { useKeyboardViewport } from '../../hooks/useKeyboardViewport';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { PaletteOpsProvider, usePaletteOpsRegister } from '../../contexts/PaletteOpsContext';
import { useDeviceSettings } from '../../hooks/useDeviceSettings';
import { useSessionProtection } from '../../hooks/useSessionProtection';
import { useProjectsState } from '../../hooks/useProjectsState';
import { useOpenSessionTabs } from '../../hooks/useOpenSessionTabs';
import { usePlugins } from '../../contexts/PluginsContext';
import PluginIcon from '../plugins/view/PluginIcon';
import { useEditorSidebar } from '../code-editor/hooks/useEditorSidebar';
import type { ActivityBarItemDef } from '../activity-bar/types';
import type { ActivityId } from '../../types/app';

export default function AppContent() {
  return (
    <PaletteOpsProvider>
      <AppContentInner />
    </PaletteOpsProvider>
  );
}

function AppContentInner() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { isMobile } = useDeviceSettings({ trackPWA: false });
  const { ws, sendMessage, latestMessage, isConnected } = useWebSocket();
  const wasConnectedRef = useRef(false);
  const { plugins } = usePlugins();

  const {
    activeSessions,
    processingSessions,
    markSessionAsActive,
    markSessionAsInactive,
    markSessionAsProcessing,
    markSessionAsNotProcessing,
  } = useSessionProtection();

  const {
    openSessions,
    addOpenSession,
    updateSessionTitle,
    markSessionError,
  } = useOpenSessionTabs();

  const {
    projects,
    selectedProject,
    selectedSession,
    activeTab,
    activeActivity,
    flyoutOpen,
    isLoadingProjects,
    externalMessageUpdate,
    newSessionTrigger,
    setActiveTab,
    setActiveActivity,
    setFlyoutOpen,
    setIsInputFocused,
    setShowSettings,
    openSettings,
    refreshProjectsSilently,
    sidebarSharedProps,
    activeSidebarPanel,
    handleActivitySelect,
    handleNewSession,
  } = useProjectsState({
    sessionId,
    navigate,
    latestMessage,
    isMobile,
    activeSessions,
    addOpenSession,
  });

  usePaletteOpsRegister({
    openSettings,
    refreshProjects: refreshProjectsSilently,
  });

  useKeyboardViewport();

  const pluginActivities = useMemo<ActivityBarItemDef[]>(() => {
    return plugins
      .filter((p) => p.enabled)
      .map((p) => ({
        id: `plugin:${p.name}` as ActivityId,
        icon: Folder,
        label: p.displayName,
        customIcon: (
          <PluginIcon
            pluginName={p.name}
            iconFile={p.icon}
            className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full"
          />
        ),
      }));
  }, [plugins]);

  // Permission recovery: query pending permissions on WebSocket reconnect or session change
  useEffect(() => {
    const isReconnect = isConnected && !wasConnectedRef.current;

    if (isReconnect) {
      wasConnectedRef.current = true;
    } else if (!isConnected) {
      wasConnectedRef.current = false;
    }

    if (isConnected && selectedSession?.id) {
      sendMessage({
        type: 'get-pending-permissions',
        sessionId: selectedSession.id
      });
    }
  }, [isConnected, selectedSession?.id, sendMessage]);

  // Global keyboard shortcuts
  useEffect(() => {
    const ACTIVITY_SHORTCUTS: Record<string, ActivityId> = {
      'e': 'explorer',
      'b': 'bookmarks',
      'k': 'search',
      'f': 'files',
      'g': 'git',
      'p': 'templates',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }

      const activity = ACTIVITY_SHORTCUTS[e.key.toLowerCase()];
      if (activity) {
        e.preventDefault();
        handleActivitySelect(activity);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleActivitySelect]);

  // Keep tab titles up to date when the selected session's metadata arrives
  useEffect(() => {
    if (selectedSession?.id && (selectedSession.summary || selectedSession.name)) {
      const title =
        selectedSession.__provider === 'cursor'
          ? (selectedSession.name as string) || 'Untitled Session'
          : (selectedSession.summary as string) || 'New Session';
      updateSessionTitle(selectedSession.id, title, selectedSession.__provider);
    }
  }, [selectedSession?.id, selectedSession?.summary, selectedSession?.name, selectedSession?.__provider, updateSessionTitle]);

  // Refresh tab titles from the latest projects data when available
  useEffect(() => {
    for (const session of openSessions) {
      if (session.title === 'New Session' || session.title === session.id.slice(0, 8)) {
        for (const project of projects) {
          const allSessions = [
            ...(project.sessions ?? []),
            ...(project.cursorSessions ?? []),
            ...(project.codexSessions ?? []),
            ...(project.geminiSessions ?? []),
          ];
          const found = allSessions.find((s) => s.id === session.id);
          if (found && (found.summary || found.name)) {
            const title =
              found.__provider === 'cursor'
                ? (found.name as string) || 'Untitled Session'
                : (found.summary as string) || 'New Session';
            updateSessionTitle(session.id, title, found.__provider);
            break;
          }
        }
      }
    }
  }, [projects, openSessions, updateSessionTitle]);

  const handleNavigateToSession = useCallback(
    (targetSessionId: string, options?: { replace?: boolean }) => {
      addOpenSession(targetSessionId);
      navigate(`/session/${targetSessionId}`, { replace: Boolean(options?.replace) });
    },
    [addOpenSession, navigate],
  );

  const handleShowSettings = useCallback(() => {
    setShowSettings(true);
  }, [setShowSettings]);

  const {
    editingFile,
    gitPanelOpen,
    editorWidth,
    editorExpanded,
    hasManualWidth,
    resizeHandleRef,
    handleFileOpen,
    handleOpenGitPanel,
    handleCloseEditor,
    handleCloseGitPanel,
    handleToggleEditorExpand,
    handleResizeStart,
  } = useEditorSidebar({ selectedProject, isMobile });

  const sidebarContent = useMemo(() => (
    <Sidebar {...sidebarSharedProps} activePanel={activeSidebarPanel} onNavigateToTab={setActiveTab} onFileOpen={handleFileOpen} onOpenGitPanel={handleOpenGitPanel} />
  ), [sidebarSharedProps, activeSidebarPanel, setActiveTab, handleFileOpen, handleOpenGitPanel]);

  const mainContent = useMemo(() => (
    <MainContent
      selectedProject={selectedProject}
      selectedSession={selectedSession}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      ws={ws}
      sendMessage={sendMessage}
      latestMessage={latestMessage}
      isMobile={isMobile}
      onMenuClick={() => setFlyoutOpen(true)}
      isLoading={isLoadingProjects}
      onInputFocusChange={setIsInputFocused}
      onSessionActive={markSessionAsActive}
      onSessionInactive={markSessionAsInactive}
      onSessionProcessing={markSessionAsProcessing}
      onSessionNotProcessing={markSessionAsNotProcessing}
      processingSessions={processingSessions}
      onNavigateToSession={handleNavigateToSession}
      onShowSettings={() => setShowSettings(true)}
      externalMessageUpdate={externalMessageUpdate}
      newSessionTrigger={newSessionTrigger}
      onSessionError={markSessionError}
      activeActivity={activeActivity}
      projects={projects}
      onProjectSelect={sidebarSharedProps.onProjectSelect}
      onNewSession={handleNewSession}
      editingFile={editingFile}
      gitPanelOpen={gitPanelOpen}
      editorWidth={editorWidth}
      editorExpanded={editorExpanded}
      hasManualWidth={hasManualWidth}
      resizeHandleRef={resizeHandleRef}
      onFileOpen={handleFileOpen}
      onCloseEditor={handleCloseEditor}
      onCloseGitPanel={handleCloseGitPanel}
      onToggleEditorExpand={handleToggleEditorExpand}
      onResizeStart={handleResizeStart}
    />
  ), [selectedProject, selectedSession, activeTab, setActiveTab, ws, sendMessage, latestMessage, isMobile, isLoadingProjects, setIsInputFocused, markSessionAsActive, markSessionAsInactive, markSessionAsProcessing, markSessionAsNotProcessing, processingSessions, handleNavigateToSession, externalMessageUpdate, newSessionTrigger, markSessionError, activeActivity, projects, sidebarSharedProps.onProjectSelect, handleNewSession, editingFile, gitPanelOpen, editorWidth, editorExpanded, hasManualWidth, resizeHandleRef, handleFileOpen, handleCloseEditor, handleCloseGitPanel, handleToggleEditorExpand, handleResizeStart]);

  const shellProps = {
    isMobile,
    activeActivity,
    onActivitySelect: handleActivitySelect,
    onShowSettings: handleShowSettings,
    pluginActivities,
    flyoutOpen,
    setFlyoutOpen,
    sidebarContent,
    mainContent,
  };

  return isMobile ? <MobileWorkspaceShell {...shellProps} /> : <DesktopWorkspaceShell {...shellProps} />;
}
