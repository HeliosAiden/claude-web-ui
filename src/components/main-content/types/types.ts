import type { Dispatch, MutableRefObject, MouseEvent, SetStateAction } from 'react';

import type { ActivityId, AppTab, Project, ProjectSession } from '../../../types/app';
import type { CodeEditorDiffInfo, CodeEditorFile } from '../../code-editor/types/types';
import type { SessionNavigationOptions } from '../../chat/types/types';
export type SessionLifecycleHandler = (sessionId?: string | null) => void;

export type MainContentProps = {
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  activeTab: AppTab;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  ws: WebSocket | null;
  sendMessage: (message: unknown) => void;
  latestMessage: unknown;
  isMobile: boolean;
  onMenuClick: () => void;
  isLoading: boolean;
  onInputFocusChange: (focused: boolean) => void;
  onSessionActive: SessionLifecycleHandler;
  onSessionInactive: SessionLifecycleHandler;
  onSessionProcessing: SessionLifecycleHandler;
  onSessionNotProcessing: SessionLifecycleHandler;
  processingSessions: Set<string>;
  onNavigateToSession: (targetSessionId: string, options?: SessionNavigationOptions) => void;
  onShowSettings: () => void;
  externalMessageUpdate: number;
  newSessionTrigger: number;
  onSessionError: SessionLifecycleHandler;
  activeActivity?: ActivityId;
  projects?: Project[];
  onProjectSelect?: (project: Project) => void;
  onNewSession?: (project: Project) => void;
  // Editor sidebar (lifted from useEditorSidebar)
  editingFile: CodeEditorFile | null;
  gitPanelOpen: boolean;
  editorWidth: number;
  editorExpanded: boolean;
  hasManualWidth: boolean;
  resizeHandleRef: MutableRefObject<HTMLDivElement | null>;
  onFileOpen: (filePath: string, diffInfo?: CodeEditorDiffInfo | null) => void;
  onCloseEditor: () => void;
  onCloseGitPanel: () => void;
  onToggleEditorExpand: () => void;
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
};

export type MainContentStateViewProps = {
  mode: 'loading' | 'empty';
  isMobile: boolean;
  onMenuClick: () => void;
  activeActivity?: import('../../../types/app').ActivityId;
};

