import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Sidebar from '../sidebar/view/Sidebar';
import MainContent from '../main-content/view/MainContent';
import CommandPalette from '../command-palette/CommandPalette';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { PaletteOpsProvider, usePaletteOpsRegister } from '../../contexts/PaletteOpsContext';
import { useDeviceSettings } from '../../hooks/useDeviceSettings';
import { useSessionProtection } from '../../hooks/useSessionProtection';
import { useProjectsState } from '../../hooks/useProjectsState';
import { useOpenSessionTabs } from '../../hooks/useOpenSessionTabs';

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
    sidebarOpen,
    isLoadingProjects,
    externalMessageUpdate,
    newSessionTrigger,
    setActiveTab,
    setSidebarOpen,
    setIsInputFocused,
    setShowSettings,
    openSettings,
    refreshProjectsSilently,
    sidebarSharedProps,
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
      setSidebarOpen(false);
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
  }, [navigate, refreshProjectsSilently, setActiveTab, setSidebarOpen]);

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

  // Adjust the app container to stay above the virtual keyboard on iOS Safari.
  // On Chrome for Android the layout viewport already shrinks when the keyboard opens,
  // so inset-0 adjusts automatically. On iOS the layout viewport stays full-height and
  // the keyboard overlays it — we use the Visual Viewport API to track keyboard height
  // and apply it as a CSS variable that shifts the container's bottom edge up.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Only resize matters — keyboard open/close changes vv.height.
      // Do NOT listen to scroll: on iOS Safari, scrolling content changes
      // vv.offsetTop which would make --keyboard-height fluctuate during
      // normal scrolling, causing the container to bounce up and down.
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

  return (
    <div className="fixed inset-0 flex bg-background" style={{ bottom: 'var(--keyboard-height, 0px)' }}>
      {!isMobile ? (
        <div className="h-full flex-shrink-0 border-r border-border/50">
          <Sidebar {...sidebarSharedProps} />
        </div>
      ) : (
        <div
          className={`fixed inset-0 z-50 flex transition-all duration-150 ease-out ${sidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
        >
          <button
            className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-150 ease-out"
            onClick={(event) => {
              event.stopPropagation();
              setSidebarOpen(false);
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSidebarOpen(false);
            }}
            aria-label={t('versionUpdate.ariaLabels.closeSidebar')}
          />
          <div
            className={`relative h-full w-[85vw] max-w-sm transform border-r border-border/40 bg-card transition-transform duration-150 ease-out sm:w-80 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Sidebar {...sidebarSharedProps} />
          </div>
        </div>
      )}

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
          onMenuClick={() => setSidebarOpen(true)}
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
        />
      </div>

      <CommandPalette
        selectedProject={selectedProject}
        onStartNewChat={handleNewSession}
        onOpenSettings={() => openSettings()}
        onShowTab={setActiveTab}
      />
    </div>
  );
}
