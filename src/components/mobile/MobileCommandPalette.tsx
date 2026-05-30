import * as React from 'react';

import { cn } from '../../lib/utils';
import type { Page } from '../../hooks/useMobileCommandPalette';

import MobileCommandPaletteContent from './MobileCommandPaletteContent';

interface SnippetRow {
  id: string;
  label: string;
  provider?: string;
  snippet?: string;
}

interface MobileCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  page?: Page;
  pages: Page[];
  onPushPage: (page: Page) => void;
  onPopPage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;

  // Data
  sessions: SnippetRow[];
  files: { path: string; name: string }[];
  commits: { hash: string; shortHash: string; message: string; author: string }[];
  branches: { name: string }[];
  sessionsShown: SnippetRow[];
  filesShown: { path: string; name: string }[];
  commitsShown: { hash: string; shortHash: string; message: string; author: string }[];
  branchesShown: { name: string }[];
  showActions: boolean;
  showSessions: boolean;
  showFiles: boolean;
  showCommits: boolean;
  showBranches: boolean;
  projectId?: string;
  selectedProject: { projectId: string; displayName: string; fullPath: string } | null;

  // Actions
  navigate: (path: string) => void;
  navigateToTab: (tab: 'conversations' | 'files' | 'chat' | 'git' | 'settings') => void;
  toggleDarkMode: () => void;
  onOpenSettings: (tab?: string) => void;
  onStartNewChat: (project: { projectId: string; displayName: string; fullPath: string }) => void;
  ops: { openFile: (path: string) => void };
  git: {
    fetch: () => Promise<void>;
    pull: () => Promise<void>;
    push: () => Promise<void>;
    checkout: (branch: string) => Promise<void>;
  };
}

export default function MobileCommandPalette({
  open,
  onClose,
  search,
  onSearchChange,
  page,
  pages,
  onPushPage,
  onPopPage,
  onKeyDown,
  sessions,
  files,
  commits,
  branches,
  sessionsShown,
  filesShown,
  commitsShown,
  branchesShown,
  showActions,
  showSessions,
  showFiles,
  showCommits,
  showBranches,
  projectId,
  selectedProject,
  navigate,
  navigateToTab,
  toggleDarkMode,
  onOpenSettings,
  onStartNewChat,
  ops,
  git,
}: MobileCommandPaletteProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent background scroll while open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleBackdropTap = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onMouseDown={handleBackdropTap}>
      {/* Backdrop */}
      <div
        className="animate-in fade-in absolute inset-0 bg-black/40 backdrop-blur-sm duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'relative w-full bg-card rounded-t-2xl border-t border-border/50 shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-bottom duration-300',
        )}
        style={{
          minHeight: '70vh',
          maxHeight: '90vh',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex touch-none items-center justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <MobileCommandPaletteContent
            search={search}
            onSearchChange={onSearchChange}
            page={page}
            pages={pages}
            onPushPage={onPushPage}
            onPopPage={onPopPage}
            onClose={onClose}
            onKeyDown={onKeyDown}
            sessions={sessions}
            files={files}
            commits={commits}
            branches={branches}
            sessionsShown={sessionsShown}
            filesShown={filesShown}
            commitsShown={commitsShown}
            branchesShown={branchesShown}
            showActions={showActions}
            showSessions={showSessions}
            showFiles={showFiles}
            showCommits={showCommits}
            showBranches={showBranches}
            projectId={projectId}
            selectedProject={selectedProject}
            navigate={navigate}
            navigateToTab={navigateToTab}
            toggleDarkMode={toggleDarkMode}
            onOpenSettings={onOpenSettings}
            onStartNewChat={onStartNewChat}
            ops={ops}
            git={git}
          />
        </div>
      </div>
    </div>
  );
}
