import { ArrowLeft, File as FileIcon } from 'lucide-react';
import type { Project } from '../../../types/app';
import SidebarFilePanel from '../../sidebar/view/subcomponents/SidebarFilePanel';

interface FileBrowserPageProps {
  selectedProject: Project | null;
  onFileOpen: (filePath: string) => void;
  onNavigateToConversations: () => void;
}

export default function FileBrowserPage({
  selectedProject,
  onFileOpen,
  onNavigateToConversations,
}: FileBrowserPageProps) {
  if (!selectedProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center bg-background">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <FileIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Select a session to browse files</p>
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
        <h1 className="text-lg font-semibold text-foreground">Files</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarFilePanel selectedProject={selectedProject} onFileOpen={onFileOpen} />
      </div>
    </div>
  );
}
