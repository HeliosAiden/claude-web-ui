import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Project, ProjectSession } from '../../types/app';
import type { ActivityId } from '../../types/app';
import type { ActivityBarItemDef } from '../activity-bar/types';
import { useMobileNavigation } from '../../hooks/useMobileNavigation';
import ProjectsFlyout from '../projects-flyout/ProjectsFlyout';
import AnimatedRouteTransitions from './AnimatedRouteTransitions';
import BottomNavigation from './BottomNavigation';
import FloatingChatHub from './FloatingChatHub';
import BottomSheet from './BottomSheet';
import BottomSheetContent from './BottomSheetContent';
import ChatPage from './pages/ChatPage';
import ConversationsPage from './pages/ConversationsPage';
import FileBrowserPage from './pages/FileBrowserPage';
import GitPage from './pages/GitPage';
import SettingsPage from './pages/SettingsPage';

interface MobileAppShellProps {
  activeActivity: ActivityId;
  onShowSettings: () => void;
  flyoutOpen: boolean;
  setFlyoutOpen: (open: boolean) => void;
  sidebarContent: ReactNode;
  mainContent: ReactNode;
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  onNavigateToSession: (sessionId: string) => void;
  onFileOpen: (filePath: string) => void;
  onOpenGitPanel: () => void;
  onNewSession: (project: Project) => void;
}

export default function MobileAppShell({
  flyoutOpen,
  setFlyoutOpen,
  sidebarContent,
  mainContent,
  selectedProject,
  selectedSession,
  onNavigateToSession,
  onFileOpen,
  onOpenGitPanel,
  onNewSession,
}: MobileAppShellProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const {
    activeTab,
    navigateToTab,
    handleChatHubTap,
    sheetOpen,
    setSheetOpen,
    goBack,
  } = useMobileNavigation({
    selectedSessionId: selectedSession?.id,
    onNavigateToSession,
  });

  const hasActiveSession = Boolean(selectedSession);
  const isKeyboardOpen = typeof document !== 'undefined' && document.documentElement.getAttribute('data-keyboard-open') === 'true';

  const handleOpenGitPanel = useCallback(() => {
    onOpenGitPanel?.();
  }, [onOpenGitPanel]);

  const handleNavigateToConversations = useCallback(() => {
    navigateToTab('conversations');
  }, [navigateToTab]);

  const handleEffortChange = useCallback((_effort: string) => {
    // Effort setting — will be wired to a future context/hook
  }, []);

  const renderPage = useMemo(() => {
    if (pathname === '/conversations') {
      return <ConversationsPage sidebarContent={sidebarContent} />;
    }
    if (/^\/session\/[^/]+\/files$/.test(pathname)) {
      return (
        <FileBrowserPage
          selectedProject={selectedProject}
          onFileOpen={onFileOpen}
          onNavigateToConversations={handleNavigateToConversations}
        />
      );
    }
    if (/^\/session\/[^/]+\/git$/.test(pathname)) {
      return (
        <GitPage
          selectedProject={selectedProject}
          onOpenGitPanel={handleOpenGitPanel}
          onFileOpen={onFileOpen}
          onNavigateToConversations={handleNavigateToConversations}
        />
      );
    }
    if (pathname === '/settings') {
      return <SettingsPage onClose={handleNavigateToConversations} />;
    }
    // Default: /session/:id or / — show chat
    return <ChatPage mainContent={mainContent} />;
  }, [
    pathname,
    sidebarContent,
    selectedProject,
    onFileOpen,
    handleNavigateToConversations,
    handleOpenGitPanel,
    mainContent,
  ]);

  return (
    <div data-layout="mobile" className="mobile-workspace fixed inset-0 bg-background">
      {/* Mobile sidebar overlay */}
      <ProjectsFlyout
        mode="overlay"
        isOpen={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
      >
        {sidebarContent}
      </ProjectsFlyout>

      {/* Animated route content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AnimatedRouteTransitions locationKey={pathname}>
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
        />
      </BottomSheet>

      {/* Floating Chat Hub button */}
      <FloatingChatHub
        onClick={handleChatHubTap}
        isActive={activeTab === 'chat'}
        hidden={isKeyboardOpen}
      />

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
