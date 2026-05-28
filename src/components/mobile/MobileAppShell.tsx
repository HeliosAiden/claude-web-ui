import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import type { Project, ProjectSession, LLMProvider } from '../../types/app';
import type { NormalizedMessage } from '../../stores/useSessionStore';
import { useMobileNavigation } from '../../hooks/useMobileNavigation';
import { useFileTreeData } from '../file-tree/hooks/useFileTreeData';
import { useGitPanelController } from '../git-panel/hooks/useGitPanelController';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useSessionStore } from '../../stores/useSessionStore';

import AnimatedRouteTransitions from './AnimatedRouteTransitions';
import BottomNavigation, { TAB_ORDER } from './BottomNavigation';
import BottomSheet from './BottomSheet';
import BottomSheetContent from './BottomSheetContent';
import ChatComposerBar from './ChatComposerBar';
import ChatPage from './pages/ChatPage';
import ConversationsPage from './pages/ConversationsPage';
import FileBrowserPage from './pages/FileBrowserPage';
import GitPage from './pages/GitPage';
import SettingsPage from './pages/SettingsPage';

interface MobileAppShellProps {
  sidebarContent: ReactNode;
  mainContent: ReactNode;
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  onFileOpen: (filePath: string) => void;
  onOpenGitPanel: () => void;
}

export default function MobileAppShell({
  sidebarContent,
  mainContent,
  selectedProject,
  selectedSession,
  onFileOpen,
  onOpenGitPanel,
}: MobileAppShellProps) {
  const location = useLocation();

  const [composerActive, setComposerActive] = useState(false);
  const { sendMessage } = useWebSocket();

  const {
    activeTab,
    navigateToTab,
    handleChatHubTap,
    sheetOpen,
    setSheetOpen,
    overrideTab,
  } = useMobileNavigation({
    selectedSessionId: selectedSession?.id,
  });

  // Preload file tree and git data when a project is selected,
  // so they're available before the user taps the Files or Git tab.
  const fileTreeData = useFileTreeData(selectedProject);
  const gitController = useGitPanelController({
    selectedProject,
    activeView: 'history',
    onFileOpen: undefined,
  });

  const prevTabIndexRef = useRef(-1);
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentTabIndex >= prevTabIndexRef.current ? 'forward' : 'backward';

  useEffect(() => {
    prevTabIndexRef.current = currentTabIndex;
  });

  const hasActiveSession = Boolean(selectedSession);
  const handleOpenGitPanel = useCallback(() => {
    onOpenGitPanel?.();
  }, [onOpenGitPanel]);

  const handleNavigateToConversations = useCallback(() => {
    navigateToTab('conversations');
  }, [navigateToTab]);

  const handleEffortChange = useCallback((_effort: string) => {
    // Effort setting — will be wired to a future context/hook
  }, []);

  const handleStartComposing = useCallback(() => {
    setSheetOpen(false);
    setComposerActive(true);
  }, []);

  const handleComposerBlur = useCallback(() => {
    setComposerActive(false);
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || !selectedProject) return;

    const provider = (localStorage.getItem('selected-provider') as LLMProvider) || 'claude';
    const modelKey = `${provider}-model`;
    const model = localStorage.getItem(modelKey) || undefined;
    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Add user message locally so it appears immediately
    const sessionId = selectedSession?.id || '';
    if (sessionId) {
      const ts = new Date().toISOString();
      const normalized: NormalizedMessage = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        timestamp: ts,
        provider,
        kind: 'text',
        role: 'user',
        content: text.trim(),
      };
      useSessionStore.getState().appendRealtime(sessionId, normalized);
    }

    sendMessage({
      type: `${provider}-command`,
      command: text.trim(),
      options: {
        projectPath: selectedProject.fullPath,
        cwd: selectedProject.fullPath,
        sessionId: sessionId || null,
        clientMessageId,
        resume: false,
        model,
        permissionMode: 'default',
      },
    });
  }, [sendMessage, selectedProject, selectedSession]);

  // Transition key changes on both URL navigation and override tab switches,
  // so AnimatedRouteTransitions animates in both cases
  const transitionKey = location.pathname + (overrideTab ? `:${overrideTab}` : '');

  const renderPage = useMemo(() => {
    if (activeTab === 'conversations') {
      return <ConversationsPage sidebarContent={sidebarContent} />;
    }
    if (activeTab === 'files') {
      return (
        <FileBrowserPage
          selectedProject={selectedProject}
          onFileOpen={onFileOpen}
          onNavigateToConversations={handleNavigateToConversations}
          preloadedFileTree={fileTreeData}
        />
      );
    }
    if (activeTab === 'git') {
      return (
        <GitPage
          selectedProject={selectedProject}
          onOpenGitPanel={handleOpenGitPanel}
          onFileOpen={onFileOpen}
          onNavigateToConversations={handleNavigateToConversations}
          preloadedGitController={gitController}
        />
      );
    }
    if (activeTab === 'settings') {
      return <SettingsPage onClose={handleNavigateToConversations} />;
    }
    // Default: chat — activeTab is 'chat'
    return <ChatPage mainContent={mainContent} />;
  }, [
    activeTab,
    sidebarContent,
    selectedProject,
    onFileOpen,
    handleNavigateToConversations,
    handleOpenGitPanel,
    mainContent,
    fileTreeData,
    gitController,
  ]);

  return (
    <div data-layout="mobile" className="mobile-workspace fixed inset-0 bg-background">
      {/* Animated route content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AnimatedRouteTransitions locationKey={transitionKey} direction={direction}>
          {renderPage}
        </AnimatedRouteTransitions>
      </div>

      {/* Chat Hub action sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <BottomSheetContent
          onClose={() => setSheetOpen(false)}
          onEffortChange={handleEffortChange}
          permissionMode="default"
          cyclePermissionMode={() => {}}
          onStartComposing={handleStartComposing}
        />
      </BottomSheet>

      {/* Floating composer bar — appears above bottom nav */}
      {composerActive && <ChatComposerBar onBlur={handleComposerBlur} onSend={handleSendMessage} />}

      {/* Bottom navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabSelect={navigateToTab}
        onChatHubTap={handleChatHubTap}
        hasActiveSession={hasActiveSession}
        sheetOpen={sheetOpen}
      />
    </div>
  );
}
