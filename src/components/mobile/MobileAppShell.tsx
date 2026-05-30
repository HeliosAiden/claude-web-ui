import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { authenticatedFetch } from '../../utils/api';
import type { Project, ProjectSession, LLMProvider, ModelAvailabilityMap } from '../../types/app';
import type { NormalizedMessage } from '../../stores/useSessionStore';
import type { PermissionMode } from '../../components/chat/types/types';
import type { MobileTabId } from '../../types/mobile';
import { useMobileNavigation } from '../../hooks/useMobileNavigation';
import { useFileTreeData } from '../file-tree/hooks/useFileTreeData';
import { useGitPanelController } from '../git-panel/hooks/useGitPanelController';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useSessionStore } from '../../stores/useSessionStore';
import { useMobileStatusStore } from '../../stores/useMobileStatusStore';

import SwipeAnimatedPageView from './SwipeAnimatedPageView';
import BottomNavigation, { TAB_ORDER } from './BottomNavigation';
import BottomSheet from './BottomSheet';
import BottomSheetContent, { PROVIDER_MODE_ORDER } from './BottomSheetContent';
import ChatComposerBar from './ChatComposerBar';
import ChatPage from './pages/ChatPage';
import ConversationsPage from './pages/ConversationsPage';
import FileBrowserPage from './pages/FileBrowserPage';
import GitPage from './pages/GitPage';
import SettingsPage from './pages/SettingsPage';
import MobileClaudeStatusBar from './MobileClaudeStatusBar';


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

  const [composerActive, setComposerActive] = useState(false);
  const [selectedEffort, setSelectedEffort] = useState<string>(() => localStorage.getItem('effort') || 'medium');
  const [selectedProvider, setSelectedProvider] = useState<string>(() => localStorage.getItem('selected-provider') || 'claude');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const provider = localStorage.getItem('selected-provider') || 'claude';
    return localStorage.getItem(`${provider}-model`) || '';
  });
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(() => {
    const saved = selectedSession?.id ? localStorage.getItem(`permissionMode-${selectedSession.id}`) : null;
    return (saved as PermissionMode) || 'default';
  });
  const [fccModels, setFccModels] = useState<{ value: string; label: string }[]>([]);
  const [modelAvailability, setModelAvailability] = useState<ModelAvailabilityMap>({});
  const { sendMessage } = useWebSocket();

  // Fetch FCC-discovered models to augment mobile Claude model options (deepseek, etc.)
  useEffect(() => {
    let cancelled = false;
    authenticatedFetch('/api/fcc/models')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.models?.length > 0) {
          setFccModels(data.models);
        }
      })
      .catch(() => { /* FCC not available — use hardcoded models */ });
    return () => { cancelled = true; };
  }, []);

  // Fetch per-model availability for standard Claude models
  useEffect(() => {
    let cancelled = false;
    authenticatedFetch('/api/models/availability')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.availability) {
          setModelAvailability(data.availability);
        }
      })
      .catch(() => { /* availability endpoint not available — fall back to all available */ });
    return () => { cancelled = true; };
  }, []);

  // Persist effort on change
  useEffect(() => {
    localStorage.setItem('effort', selectedEffort);
  }, [selectedEffort]);

  // Persist permission mode on change
  useEffect(() => {
    if (selectedSession?.id) {
      localStorage.setItem(`permissionMode-${selectedSession.id}`, permissionMode);
    }
  }, [permissionMode, selectedSession?.id]);

  const {
    activeTab,
    navigateToTab,
    handleChatHubTap,
    sheetOpen,
    setSheetOpen,
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

  const hasActiveSession = Boolean(selectedSession);
  const handleOpenGitPanel = useCallback(() => {
    onOpenGitPanel?.();
  }, [onOpenGitPanel]);

  const handleNavigateToConversations = useCallback(() => {
    navigateToTab('conversations');
  }, [navigateToTab]);

  const handleEffortChange = useCallback((effort: string) => {
    setSelectedEffort(effort);
  }, []);

  const handleModelSelect = useCallback((model: string) => {
    const provider = selectedProvider;
    localStorage.setItem(`${provider}-model`, model);
    setSelectedModel(model);
  }, [selectedProvider]);

  const handleProviderSelect = useCallback((provider: string) => {
    localStorage.setItem('selected-provider', provider);
    setSelectedProvider(provider);
    // Restore this provider's last-selected model
    const savedModel = localStorage.getItem(`${provider}-model`);
    if (savedModel) {
      setSelectedModel(savedModel);
    } else {
      // Default model will be picked up by modelInfo compute on next render
      setSelectedModel('');
    }
    // Reset permission mode if current mode isn't supported by new provider
    setPermissionMode((prev) => {
      const modes = PROVIDER_MODE_ORDER[provider] || PROVIDER_MODE_ORDER.claude;
      return modes.includes(prev) ? prev : modes[0];
    });
  }, []);

  const handleCyclePermissionMode = useCallback(() => {
    setPermissionMode((prev) => {
      const modes = PROVIDER_MODE_ORDER[selectedProvider] || PROVIDER_MODE_ORDER.claude;
      const idx = modes.indexOf(prev);
      // If current mode isn't valid for this provider, start from default
      if (idx === -1) return modes[0];
      const next = modes[(idx + 1) % modes.length];
      return next;
    });
  }, [selectedProvider]);

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

    // Immediately show the status banner — mirrors desktop useChatComposerState.handleSubmit.
    // Without this, the banner would rely on a WebSocket round-trip that may skip
    // setIsLoading(true) due to session-matching checks (selectedSession may be null
    // for a first message in a new session).
    useMobileStatusStore.getState().sync({
      isLoading: true,
      status: { text: 'Processing', tokens: 0, can_interrupt: true },
      provider,
      onAbort: null, // ChatInterface's sync effect will set the real onAbort once canAbortSession is true
    });

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
        effort: selectedEffort,
        permissionMode,
      },
    });
  }, [sendMessage, selectedProject, selectedSession, selectedEffort, permissionMode]);

  const pageComponents: Record<MobileTabId, ReactNode> = useMemo(() => ({
    conversations: <ConversationsPage sidebarContent={sidebarContent} />,
    files: (
      <FileBrowserPage
        selectedProject={selectedProject}
        onFileOpen={onFileOpen}
        onNavigateToConversations={handleNavigateToConversations}
        preloadedFileTree={fileTreeData}
      />
    ),
    chat: <ChatPage mainContent={mainContent} />,
    git: (
      <GitPage
        selectedProject={selectedProject}
        onOpenGitPanel={handleOpenGitPanel}
        onFileOpen={onFileOpen}
        onNavigateToConversations={handleNavigateToConversations}
        preloadedGitController={gitController}
      />
    ),
    settings: <SettingsPage onClose={handleNavigateToConversations} />,
  }), [
    sidebarContent, selectedProject, onFileOpen, handleNavigateToConversations,
    handleOpenGitPanel, mainContent, fileTreeData, gitController,
  ]);

  return (
    <div
      data-layout="mobile"
      data-sheet-open={sheetOpen ? '' : undefined}
      className="mobile-workspace fixed inset-0 bg-background"
    >
      {/* Mobile status bar — appears while provider is generating a response */}
      <MobileClaudeStatusBar />
      {/* Swipeable page content */}
      <SwipeAnimatedPageView
        activeTab={activeTab}
        onTabChange={navigateToTab}
        pages={pageComponents}
        tabOrder={TAB_ORDER}
      />

      {/* Chat Hub action sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <BottomSheetContent
          selectedEffort={selectedEffort}
          onEffortChange={handleEffortChange}
          permissionMode={permissionMode}
          cyclePermissionMode={handleCyclePermissionMode}
          onStartComposing={handleStartComposing}
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          selectedProvider={selectedProvider}
          onProviderSelect={handleProviderSelect}
          fccModels={fccModels}
          modelAvailability={modelAvailability}
          onClose={() => setSheetOpen(false)}
        />
      </BottomSheet>

      {composerActive && <ChatComposerBar onBlur={handleComposerBlur} onSend={handleSendMessage} fccModels={fccModels} modelAvailability={modelAvailability} />}

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
