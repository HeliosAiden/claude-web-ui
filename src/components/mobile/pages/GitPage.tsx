import { ArrowLeft, GitBranch } from 'lucide-react';
import type { Project } from '../../../types/app';
import SidebarGitPanel from '../../sidebar/view/subcomponents/SidebarGitPanel';

interface GitPageProps {
  selectedProject: Project | null;
  onOpenGitPanel: () => void;
  onFileOpen: (filePath: string) => void;
  onNavigateToConversations: () => void;
}

export default function GitPage({
  selectedProject,
  onOpenGitPanel,
  onFileOpen,
  onNavigateToConversations,
}: GitPageProps) {
  if (!selectedProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center bg-background">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <GitBranch className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Select a session to view source control</p>
        <button
          type="button"
          onClick={onNavigateToConversations}
          className="text-sm text-primary hover:underline"
        >
          Go to conversations
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button
          type="button"
          onClick={onNavigateToConversations}
          className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Source Control</h1>
        {onOpenGitPanel && (
          <button
            type="button"
            onClick={onOpenGitPanel}
            className="ml-auto text-sm text-primary hover:underline"
          >
            Open Panel
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarGitPanel selectedProject={selectedProject} onOpenGitPanel={onOpenGitPanel} onFileOpen={onFileOpen} />
      </div>
    </div>
  );
}
