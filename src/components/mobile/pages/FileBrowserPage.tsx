import { ArrowLeft, File as FileIcon } from 'lucide-react';

import type { Project } from '../../../types/app';
import type { UseFileTreeDataResult } from '../../file-tree/hooks/useFileTreeData';
import SidebarFilePanel from '../../sidebar/view/subcomponents/SidebarFilePanel';

interface FileBrowserPageProps {
  selectedProject: Project | null;
  onFileOpen: (filePath: string) => void;
  onNavigateToConversations: () => void;
  preloadedFileTree?: UseFileTreeDataResult;
}

export default function FileBrowserPage({
  selectedProject,
  onFileOpen,
  onNavigateToConversations,
  preloadedFileTree,
}: FileBrowserPageProps) {
  if (!selectedProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Select a session to browse files</p>
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
        <h1 className="text-lg font-semibold text-foreground">Files</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarFilePanel selectedProject={selectedProject} onFileOpen={onFileOpen} preloadedFileTree={preloadedFileTree} />
      </div>
    </div>
  );
}
