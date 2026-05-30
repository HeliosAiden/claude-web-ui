import { useCallback, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

import type { Project } from '../../../../types/app';
import type { CodeEditorDiffInfo } from '../../types/types';
import type { FileDiffInfo, ConfirmationRequest  } from '../../../git-panel/types/types';
import { useGitPanelController } from '../../../git-panel/hooks/useGitPanelController';
import ChangesView from '../../../git-panel/view/changes/ChangesView';
import ConfirmActionModal from '../../../git-panel/view/modals/ConfirmActionModal';

type GitEditorPanelProps = {
  selectedProject: Project | null;
  isMobile: boolean;
  isSidebar: boolean;
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: (() => void) | null;
  onPopOut: (() => void) | null;
  onFileOpen: (filePath: string, diffInfo?: CodeEditorDiffInfo | null) => void;
};

export default function GitEditorPanel({
  selectedProject,
  isMobile,
  isSidebar: _isSidebar,
  isExpanded,
  onClose,
  onToggleExpand,
  onPopOut,
  onFileOpen,
}: GitEditorPanelProps) {
  const [wrapText, setWrapText] = useState(true);
  const [hasExpandedFiles, setHasExpandedFiles] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmationRequest | null>(null);

  const handleGitFileOpen = useCallback(
    (filePath: string, diffInfo?: FileDiffInfo) => {
      onClose();
      onFileOpen(filePath, diffInfo ?? undefined);
    },
    [onClose, onFileOpen],
  );

  const {
    gitStatus,
    gitDiff,
    isLoading,
    currentBranch: _currentBranch,
    isCreatingInitialCommit,
    refreshAll,
    discardChanges,
    deleteUntrackedFile,
    generateCommitMessage,
    commitChanges,
    createInitialCommit,
    openFile,
  } = useGitPanelController({
    selectedProject,
    activeView: 'changes',
    onFileOpen: handleGitFileOpen,
  });

  const executeConfirmedAction = useCallback(async () => {
    if (!confirmAction) return;
    const actionToExecute = confirmAction;
    setConfirmAction(null);
    try {
      await actionToExecute.onConfirm();
    } catch (error) {
      console.error('Error executing confirmation action:', error);
    }
  }, [confirmAction]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex min-w-0 flex-shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">Source Control</h3>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          {onPopOut && (
            <button
              type="button"
              onClick={onPopOut}
              className="flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title="Pop out"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedProject && (
          <ChangesView
            key={selectedProject.fullPath}
            isMobile={isMobile}
            projectPath={selectedProject.fullPath}
            gitStatus={gitStatus}
            gitDiff={gitDiff}
            isLoading={isLoading}
            wrapText={wrapText}
            isCreatingInitialCommit={isCreatingInitialCommit}
            onWrapTextChange={setWrapText}
            onCreateInitialCommit={createInitialCommit}
            onOpenFile={openFile}
            onDiscardFile={discardChanges}
            onDeleteFile={deleteUntrackedFile}
            onCommitChanges={commitChanges}
            onGenerateCommitMessage={generateCommitMessage}
            onRequestConfirmation={setConfirmAction}
            onExpandedFilesChange={setHasExpandedFiles}
          />
        )}
      </div>

      <ConfirmActionModal
        action={confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          void executeConfirmedAction();
        }}
      />
    </div>
  );
}
