import { ArrowLeft, GitBranch } from 'lucide-react';

import type { Project } from '../../../types/app';
import type { GitPanelController } from '../../git-panel/types/types';
import SidebarGitPanel from '../../sidebar/view/subcomponents/SidebarGitPanel';

interface GitPageProps {
  selectedProject: Project | null;
  onOpenGitPanel: () => void;
  onFileOpen: (filePath: string) => void;
  onNavigateToConversations: () => void;
  preloadedGitController?: GitPanelController;
}

export default function GitPage({
  selectedProject,
  onOpenGitPanel,
  onFileOpen,
  onNavigateToConversations,
  preloadedGitController,
}: GitPageProps) {
  if (!selectedProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <GitBranch className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Select a session to view source control</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <button
          type="button"
          onClick={onNavigateToConversations}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground active:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Source Control</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarGitPanel
          selectedProject={selectedProject}
          onOpenGitPanel={onOpenGitPanel}
          onFileOpen={onFileOpen}
          preloadedGitController={preloadedGitController}
        />
      </div>
    </div>
  );
}
