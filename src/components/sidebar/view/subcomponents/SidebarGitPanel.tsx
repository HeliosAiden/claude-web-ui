import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ChevronRight,
  ExternalLink,
  GitBranch,
  RefreshCw,
} from 'lucide-react';

import type { Project } from '../../../../types/app';
import { useGitPanelController } from '../../../git-panel/hooks/useGitPanelController';
import { parseCommitFiles } from '../../../git-panel/utils/gitPanelUtils';
import type { GitCommitSummary, GitStatusResponse, GitRemoteStatus } from '../../../git-panel/types/types';
import { cn } from '../../../../lib/utils';

type SidebarGitPanelProps = {
  selectedProject: Project | null;
  onOpenGitPanel?: () => void;
  onFileOpen?: (filePath: string) => void;
  isMobile?: boolean;
  preloadedGitController?: {
    gitStatus: GitStatusResponse | null;
    currentBranch: string;
    branches: string[];
    localBranches: string[];
    remoteStatus: GitRemoteStatus | null;
    recentCommits: GitCommitSummary[];
    commitDiffs: Record<string, string>;
    isLoading: boolean;
    refreshAll: () => void;
    handleFetch: () => void;
    switchBranch: (branch: string) => Promise<boolean>;
    fetchCommitDiff: (hash: string) => void;
  };
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  return `${Math.floor(diffHrs / 24)}d`;
}

function CommitDetail({
  commit,
  commitDiff,
  onFetchDiff,
}: {
  commit: GitCommitSummary;
  commitDiff: string | undefined;
  onFetchDiff: (hash: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    if (!expanded && !commitDiff) {
      onFetchDiff(commit.hash);
    }
    setExpanded((prev) => !prev);
  };

  const fileSummary = commitDiff ? parseCommitFiles(commitDiff) : null;
  const shortHash = commit.hash.slice(0, 7);

  return (
    <div>
      <button
        type="button"
        className="-mx-0.5 flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left text-[11px] transition-colors hover:bg-accent/50"
        onClick={handleToggle}
      >
        <ChevronRight
          className={cn('h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')}
        />
        <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground/60">{shortHash}</span>
        <span className="flex-1 truncate text-muted-foreground">{commit.message.split('\n')[0]}</span>
        <span className="flex-shrink-0 text-[10px] text-muted-foreground/50">{formatRelativeTime(commit.date)}</span>
      </button>
      {expanded && (
        <div className="mb-1 ml-5 mt-0.5 space-y-0.5 text-[10px] text-muted-foreground/70">
          <div>
            <span className="font-medium">{commit.author}</span>
          </div>
          {!commitDiff && (
            <div className="flex items-center gap-1 py-1">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span>Loading diff...</span>
            </div>
          )}
          {fileSummary && (
            <div>
              <span>{fileSummary.totalFiles} files, +{fileSummary.totalInsertions}/-{fileSummary.totalDeletions}</span>
              <div className="mt-0.5 space-y-0.5">
                {fileSummary.files.slice(0, 10).map((f) => (
                  <div key={f.path} className="flex items-center gap-1 truncate">
                    <span className={cn('flex-shrink-0 font-mono text-[9px] w-3', STATUS_COLORS[f.status] ?? 'text-muted-foreground')}>
                      {f.status}
                    </span>
                    <span className="truncate">{f.filename}</span>
                    <span className="flex-shrink-0 text-muted-foreground/50">
                      +{f.insertions}/-{f.deletions}
                    </span>
                  </div>
                ))}
                {fileSummary.files.length > 10 && (
                  <span className="text-muted-foreground/50">+{fileSummary.files.length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarGitPanel({ selectedProject, onOpenGitPanel, onFileOpen, isMobile, preloadedGitController }: SidebarGitPanelProps) {
  const projectId = selectedProject?.projectId ?? null;

  const hookController = useGitPanelController({
    selectedProject,
    activeView: 'history',
    onFileOpen: undefined,
  });
  const controller = preloadedGitController ?? hookController;
  const {
    gitStatus,
    currentBranch,
    localBranches,
    remoteStatus,
    recentCommits,
    commitDiffs,
    isLoading,
    refreshAll,
    handleFetch,
    switchBranch,
    fetchCommitDiff,
  } = controller;

  const [showChanges, setShowChanges] = useState(true);
  const [showCommits, setShowCommits] = useState(false);
  const [showBranches, setShowBranches] = useState(false);

  useEffect(() => {
    if (projectId && !preloadedGitController) {
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

  const sectionHeader = (label: string, expanded: boolean, onToggle: () => void, count?: number) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronRight className={cn('h-3 w-3 flex-shrink-0 transition-transform', expanded && 'rotate-90')} />
      <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      {count !== undefined && <span className="text-[10px] text-muted-foreground/60">({count})</span>}
    </button>
  );

  if (!projectId) {
    return (
      <div className="px-3 py-8 text-center">
        <GitBranch className="mx-auto h-5 w-5 text-muted-foreground/40" />
        <p className="mt-2 text-xs text-muted-foreground">Select a project to view source control</p>
      </div>
    );
  }

  if (isLoading && !gitStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-xs font-medium text-foreground">Source Control</span>
        <button
          type="button"
          onClick={() => refreshAll()}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div
        className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2 text-xs"
        style={{ paddingBottom: 'calc(8px + var(--mobile-scroll-bottom-inset, env(safe-area-inset-bottom, 0px)))' }}
      >
        {/* Branch info */}
        {currentBranch && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GitBranch className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-mono text-[11px]">{currentBranch}</span>
            {remoteStatus && (
              <span className="flex-shrink-0 text-[10px] text-muted-foreground/60">
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
            className="flex items-center gap-1 rounded-md bg-accent/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => handleFetch()}
          >
            <ArrowDownToLine className="h-3 w-3" />
            Fetch
          </button>
        </div>

        {/* === Changes section === */}
        {sectionHeader('Changes', showChanges, () => setShowChanges((prev) => !prev), totalChanges)}
        {showChanges && (
          <div className="space-y-0.5">
            {totalChanges > 0 && (
              <div className="flex items-center gap-2 pl-4 text-[11px] text-muted-foreground">
                {counts.M ? <span className={cn('font-medium', STATUS_COLORS.M)}>{counts.M}M</span> : null}
                {counts.A ? <span className={cn('font-medium', STATUS_COLORS.A)}>{counts.A}A</span> : null}
                {counts.D ? <span className={cn('font-medium', STATUS_COLORS.D)}>{counts.D}D</span> : null}
                {counts.U ? <span className={cn('font-medium', STATUS_COLORS.U)}>{counts.U}U</span> : null}
              </div>
            )}
            {totalChanges === 0 && (
              <p className="pl-4 text-[11px] text-muted-foreground/60">No changes</p>
            )}
            {changedFiles.slice(0, 10).map((file) => (
              <button
                key={file.path}
                type="button"
                className="-mx-0.5 flex w-full items-center gap-1.5 truncate rounded px-0.5 py-0.5 pl-4 text-left text-[11px] transition-colors hover:bg-accent/50"
                onClick={() => onFileOpen?.(file.path)}
              >
                <span className={cn('flex-shrink-0 font-mono text-[10px] w-3', STATUS_COLORS[file.status] ?? STATUS_COLORS.M)}>
                  {file.status}
                </span>
                <span className="truncate text-muted-foreground">{file.path}</span>
              </button>
            ))}
            {changedFiles.length > 10 && (
              <p className="pl-4 text-[10px] text-muted-foreground/50">
                +{changedFiles.length - 10} more files
              </p>
            )}
          </div>
        )}

        {/* === Commits section === */}
        {sectionHeader('Commits', showCommits, () => setShowCommits((prev) => !prev), recentCommits.length)}
        {showCommits && (
          <div className="space-y-0.5 pl-4">
            {recentCommits.length === 0 && (
              <p className="text-[11px] text-muted-foreground/60">No commits</p>
            )}
            {recentCommits.slice(0, 5).map((commit) => (
              <CommitDetail
                key={commit.hash}
                commit={commit}
                commitDiff={commitDiffs[commit.hash]}
                onFetchDiff={fetchCommitDiff}
              />
            ))}
            {recentCommits.length > 5 && (
              <p className="text-[10px] text-muted-foreground/50">
                +{recentCommits.length - 5} more commits
              </p>
            )}
          </div>
        )}

        {/* === Branches section === */}
        {sectionHeader('Branches', showBranches, () => setShowBranches((prev) => !prev), localBranches.length)}
        {showBranches && (
          <div className="space-y-0.5 pl-4">
            {localBranches.length === 0 && (
              <p className="text-[11px] text-muted-foreground/60">No branches</p>
            )}
            {localBranches.slice(0, 5).map((branch) => {
              const isCurrent = branch === currentBranch;
              return (
                <div key={branch} className="flex items-center gap-1.5">
                  <span className={cn('flex-1 truncate text-[11px] font-mono', isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {branch}
                  </span>
                  {!isCurrent && (
                    <button
                      type="button"
                      className="flex-shrink-0 text-[10px] text-primary hover:underline"
                      onClick={() => { void switchBranch(branch); }}
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
            {localBranches.length > 5 && (
              <p className="text-[10px] text-muted-foreground/50">
                +{localBranches.length - 5} more branches
              </p>
            )}
          </div>
        )}
      </div>

      {/* Open full panel link — desktop only */}
      {!isMobile && (
        <div className="flex-shrink-0 border-t border-border/40 px-3 py-2">
          <button
            type="button"
            onClick={() => onOpenGitPanel?.()}
            className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Open Full Panel
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(SidebarGitPanel);
