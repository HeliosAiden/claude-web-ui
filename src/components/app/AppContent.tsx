import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Folder } from 'lucide-react';

import Sidebar from '../sidebar/view/Sidebar';
import MainContent from '../main-content/view/MainContent';
import CommandPalette from '../command-palette/CommandPalette';
import ActivityBar from '../activity-bar/ActivityBar';
import ProjectsFlyout from '../projects-flyout/ProjectsFlyout';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { PaletteOpsProvider, usePaletteOpsRegister } from '../../contexts/PaletteOpsContext';
import { useDeviceSettings } from '../../hooks/useDeviceSettings';
import { useSessionProtection } from '../../hooks/useSessionProtection';
import { useProjectsState } from '../../hooks/useProjectsState';
import { useOpenSessionTabs } from '../../hooks/useOpenSessionTabs';
import { usePlugins } from '../../contexts/PluginsContext';
import PluginIcon from '../plugins/view/PluginIcon';
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
  const { t } = useTranslation('common');
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
    errorSessions,
    addOpenSession,
    removeOpenSession,
    updateSessionTitle,
    markSessionError,
    clearSessionError,
  } = useOpenSessionTabs();

  const {
    projects,
    selectedProject,
    selectedSession,
    activeTab,
    activeActivity,
    flyoutOpen,
    flyoutPinned,
    isLoadingProjects,
    externalMessageUpdate,
    newSessionTrigger,
    setActiveTab,
    setActiveActivity,
    setFlyoutOpen,
    setFlyoutPinned,
    setIsInputFocused,
    setShowSettings,
    openSettings,
    refreshProjectsSilently,
    sidebarSharedProps,
    activeSidebarPanel,
    handleActivitySelect,
    handleToggleFlyout,
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

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || message.type !== 'notification:navigate') {
        return;
      }

      if (typeof message.provider === 'string' && message.provider.trim()) {
        localStorage.setItem('selected-provider', message.provider);
      }

      setActiveTab('chat');
      setActiveActivity('explorer');
      setFlyoutOpen(false);

      void refreshProjectsSilently();

      if (typeof message.sessionId === 'string' && message.sessionId) {
        navigate(`/session/${message.sessionId}`);
        return;
      }

      navigate('/');
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [navigate, refreshProjectsSilently, setActiveTab, setActiveActivity, setFlyoutOpen]);

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
      'q': 'search',
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

  // Adjust the app container to stay above the virtual keyboard on iOS Safari.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height);
      document.documentElement.style.setProperty('--keyboard-height', `${kb}px`);
    };
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

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

  const handleCloseTab = useCallback(
    (sessionId: string) => {
      const remaining = openSessions.filter((s) => s.id !== sessionId);
      removeOpenSession(sessionId);
      if (selectedSession?.id === sessionId) {
        if (remaining.length > 0) {
          const closedIndex = openSessions.findIndex((s) => s.id === sessionId);
          const nextSession = remaining[Math.min(closedIndex, remaining.length - 1)];
          navigate(`/session/${nextSession.id}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    },
    [removeOpenSession, selectedSession?.id, openSessions, navigate],
  );

  const handleShowSettings = useCallback(() => {
    setShowSettings(true);
  }, [setShowSettings]);

  return (
    <div className="fixed inset-0 flex bg-background" style={{ bottom: 'var(--keyboard-height, 0px)' }}>
      {/* Desktop Activity Bar (left rail) */}
      {!isMobile && (
        <ActivityBar
          activeActivity={activeActivity}
          onActivitySelect={handleActivitySelect}
          isMobile={false}
          flyoutOpen={flyoutOpen}
          onToggleFlyout={handleToggleFlyout}
          onShowSettings={handleShowSettings}
          pluginActivities={pluginActivities}
        />
      )}

      {/* Pinned flyout (desktop only, in document flow) */}
      {!isMobile && flyoutPinned && (
        <ProjectsFlyout
          mode="pinned"
          isOpen={flyoutOpen}
          onClose={() => setFlyoutOpen(false)}
          onTogglePin={() => setFlyoutPinned(false)}
          isPinned={flyoutPinned}
        >
          <Sidebar {...sidebarSharedProps} activePanel={activeSidebarPanel} onNavigateToTab={setActiveTab} />
        </ProjectsFlyout>
      )}

      {/* Overlay flyout (desktop unpinned or mobile) */}
      <ProjectsFlyout
        mode="overlay"
        isOpen={flyoutOpen && !flyoutPinned}
        onClose={() => setFlyoutOpen(false)}
        onTogglePin={() => setFlyoutPinned(true)}
        isPinned={false}
      >
        <Sidebar {...sidebarSharedProps} activePanel={activeSidebarPanel} onNavigateToTab={setActiveTab} />
      </ProjectsFlyout>

      <div className="flex min-w-0 flex-1 flex-col">
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
          openSessions={openSessions}
          errorSessions={errorSessions}
          onSessionError={markSessionError}
          onSessionErrorClear={clearSessionError}
          onCloseTab={handleCloseTab}
          activeActivity={activeActivity}
          flyoutPinned={flyoutPinned}
          projects={projects}
          onProjectSelect={sidebarSharedProps.onProjectSelect}
          onNewSession={handleNewSession}
        />
      </div>

      {/* Mobile bottom ActivityBar */}
      {isMobile && (
        <ActivityBar
          activeActivity={activeActivity}
          onActivitySelect={handleActivitySelect}
          isMobile={true}
          flyoutOpen={flyoutOpen}
          onToggleFlyout={handleToggleFlyout}
          onShowSettings={handleShowSettings}
          pluginActivities={pluginActivities}
        />
      )}

      <CommandPalette
        selectedProject={selectedProject}
        onStartNewChat={handleNewSession}
        onOpenSettings={() => openSettings()}
        onShowTab={setActiveTab}
      />
    </div>
  );
}
