import React, { useEffect } from 'react';
import { ArrowDownToLine, ExternalLink, GitBranch, RefreshCw } from 'lucide-react';
import type { Project, AppTab } from '../../../../types/app';
import { useGitPanelController } from '../../../git-panel/hooks/useGitPanelController';
import { cn } from '../../../../lib/utils';

type SidebarGitPanelProps = {
  selectedProject: Project | null;
  onNavigateToTab?: (tab: AppTab) => void;
};

const STATUS_COLORS: Record<string, string> = {
  M: 'text-amber-500',
  A: 'text-emerald-500',
  D: 'text-red-500',
  U: 'text-blue-400',
};

type ChangeEntry = { status: string; path: string };

function buildChangeList(
  modified: string[] | undefined,
  added: string[] | undefined,
  deleted: string[] | undefined,
  untracked: string[] | undefined,
): ChangeEntry[] {
  return [
    ...(modified ?? []).map((p) => ({ status: 'M', path: p })),
    ...(added ?? []).map((p) => ({ status: 'A', path: p })),
    ...(deleted ?? []).map((p) => ({ status: 'D', path: p })),
    ...(untracked ?? []).map((p) => ({ status: 'U', path: p })),
  ];
}

function SidebarGitPanel({ selectedProject, onNavigateToTab }: SidebarGitPanelProps) {
  const projectId = selectedProject?.projectId ?? null;

  const {
    gitStatus,
    currentBranch,
    remoteStatus,
    isLoading,
    refreshAll,
  } = useGitPanelController({
    selectedProject,
    activeView: 'changes',
  });

  useEffect(() => {
    if (projectId) {
      refreshAll();
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const changedFiles = buildChangeList(
    gitStatus?.modified,
    gitStatus?.added,
    gitStatus?.deleted,
    gitStatus?.untracked,
  );
  const totalChanges = changedFiles.length;

  const counts: Record<string, number> = {};
  for (const f of changedFiles) {
    counts[f.status] = (counts[f.status] ?? 0) + 1;
  }

  if (!projectId) {
    return (
      <div className="px-3 py-8 text-center">
        <GitBranch className="mx-auto h-5 w-5 text-muted-foreground/40" />
        <p className="mt-2 text-xs text-muted-foreground">Select a project to view source control</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-xs font-medium text-foreground">Source Control</span>
        <button
          type="button"
          onClick={() => refreshAll()}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs">
        {/* Branch info */}
        {currentBranch && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            <span className="font-mono text-[11px]">{currentBranch}</span>
            {remoteStatus && (
              <span className="text-[10px] text-muted-foreground/60">
                {(remoteStatus.ahead ?? 0) > 0 && `↑${remoteStatus.ahead} `}
                {(remoteStatus.behind ?? 0) > 0 && `↓${remoteStatus.behind}`}
              </span>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md bg-accent/40 px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => refreshAll()}
          >
            <ArrowDownToLine className="h-3 w-3" />
            Fetch
          </button>
        </div>

        {/* Change summary */}
        {totalChanges > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {counts.M ? <span className={cn('font-medium', STATUS_COLORS.M)}>{counts.M}M</span> : null}
            {counts.A ? <span className={cn('font-medium', STATUS_COLORS.A)}>{counts.A}A</span> : null}
            {counts.D ? <span className={cn('font-medium', STATUS_COLORS.D)}>{counts.D}D</span> : null}
            {counts.U ? <span className={cn('font-medium', STATUS_COLORS.U)}>{counts.U}U</span> : null}
            <span>{totalChanges} changed</span>
          </div>
        )}

        {totalChanges === 0 && (
          <p className="text-[11px] text-muted-foreground/60">No changes</p>
        )}

        {/* Changed files list */}
        {changedFiles.slice(0, 15).map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-1.5 truncate text-[11px]"
          >
            <span className={cn('flex-shrink-0 font-mono text-[10px] w-3', STATUS_COLORS[file.status] ?? STATUS_COLORS.M)}>
              {file.status}
            </span>
            <span className="truncate text-muted-foreground">{file.path}</span>
          </div>
        ))}

        {changedFiles.length > 15 && (
          <p className="text-[10px] text-muted-foreground/50">
            +{changedFiles.length - 15} more files
          </p>
        )}
      </div>

      {/* Open full panel link */}
      <div className="flex-shrink-0 border-t border-border/40 px-3 py-2">
        <button
          type="button"
          onClick={() => onNavigateToTab?.('git')}
          className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open Full Panel
        </button>
      </div>
    </div>
  );
}

export default React.memo(SidebarGitPanel);
