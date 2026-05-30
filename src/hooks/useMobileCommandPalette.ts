import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '../contexts/ThemeContext';
import { usePaletteOps } from '../contexts/PaletteOpsContext';
import type { AppTab, Project } from '../types/app';
import type { MobileTabId } from '../types/mobile';
import { useSessionsSource } from '../components/command-palette/sources/useSessionsSource';
import { useFilesSource } from '../components/command-palette/sources/useFilesSource';
import { useCommitsSource } from '../components/command-palette/sources/useCommitsSource';
import { useSessionMessageSearch } from '../components/command-palette/sources/useSessionMessageSearch';
import { useBranchesSource } from '../components/command-palette/sources/useBranchesSource';
import { useGitActions } from '../components/command-palette/sources/useGitActions';

export type Page = 'actions' | 'files' | 'sessions' | 'commits' | 'branches';

export const PAGE_LABELS: Record<Page, string> = {
  actions: 'Actions',
  files: 'Files',
  sessions: 'Sessions',
  commits: 'Commits',
  branches: 'Branches',
};

export const NAV_TABS: Array<{ id: AppTab; label: string; keywords: string }> = [
  { id: 'chat', label: 'Go to Chat', keywords: 'chat messages conversation' },
  { id: 'files', label: 'Go to Files', keywords: 'files file tree explorer' },
  { id: 'shell', label: 'Go to Shell', keywords: 'shell terminal console' },
  { id: 'git', label: 'Go to Git', keywords: 'git diff branches' },
];

interface UseMobileCommandPaletteOptions {
  selectedProject: Project | null;
  navigateToTab: (tab: MobileTabId) => void;
  onOpenSettings: (tab?: string) => void;
  onStartNewChat: (project: Project) => void;
}

export function useMobileCommandPalette({
  selectedProject,
  navigateToTab,
  onOpenSettings,
  onStartNewChat,
}: UseMobileCommandPaletteOptions) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [pages, setPages] = React.useState<Page[]>([]);
  const { toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const ops = usePaletteOps();

  const page = pages.at(-1);

  const projectId = selectedProject?.projectId;

  const showActions = !page || page === 'actions';
  const showSessions = !page || page === 'sessions';
  const showFiles = !page || page === 'files';
  const showCommits = !page || page === 'commits';
  const showBranches = !page || page === 'branches' || page === 'actions';

  const sessions = useSessionsSource(projectId, open && showSessions);
  const messageMatches = useSessionMessageSearch(projectId, search, open && showSessions);
  const files = useFilesSource(projectId, open && showFiles);
  const commits = useCommitsSource(projectId, open && showCommits);
  const branches = useBranchesSource(projectId, open && showBranches);
  const git = useGitActions(projectId);

  const sessionRows = React.useMemo(() => {
    if (!showSessions) return [];
    type Row = { id: string; label: string; provider?: string; snippet?: string };
    const byId = new Map<string, Row>();
    for (const s of sessions) {
      byId.set(s.id, { id: s.id, label: s.label, provider: s.provider });
    }
    for (const m of messageMatches) {
      const existing = byId.get(m.sessionId);
      if (existing) {
        existing.snippet = m.snippet;
      } else {
        byId.set(m.sessionId, {
          id: m.sessionId,
          label: m.label,
          provider: m.provider,
          snippet: m.snippet,
        });
      }
    }
    return Array.from(byId.values());
  }, [sessions, messageMatches, showSessions]);

  const close = React.useCallback(() => {
    setOpen(false);
    setSearch('');
    setPages([]);
  }, []);

  const openPalette = React.useCallback(() => {
    setOpen(true);
    setSearch('');
    setPages([]);
  }, []);

  const pushPage = React.useCallback((next: Page) => {
    setSearch('');
    setPages((prev) => [...prev, next]);
  }, []);

  const popPage = React.useCallback(() => {
    setSearch('');
    setPages((prev) => prev.slice(0, -1));
  }, []);

  const run = React.useCallback(
    (fn: () => void) => {
      close();
      fn();
    },
    [close],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !search && pages.length > 0) {
        e.preventDefault();
        popPage();
      }
    },
    [search, pages.length, popPage],
  );

  const browseLimit = 5;

  return {
    open,
    search,
    setSearch,
    page,
    pages,
    openPalette,
    close,
    pushPage,
    popPage,
    run,
    handleKeyDown,
    // Full arrays for browse-all checks
    sessions: sessionRows,
    files,
    commits,
    branches,
    // Truncated arrays for rendering
    sessionsShown: page === 'sessions' ? sessionRows : sessionRows.slice(0, browseLimit),
    filesShown: page === 'files' ? files : files.slice(0, browseLimit),
    commitsShown: page === 'commits' ? commits : commits.slice(0, browseLimit),
    branchesShown: page === 'branches' ? branches : branches.slice(0, browseLimit),
    showActions,
    showSessions,
    showFiles,
    showCommits,
    showBranches,
    projectId,
    navigate,
    navigateToTab,
    toggleDarkMode,
    onOpenSettings,
    onStartNewChat,
    selectedProject,
    ops,
    git,
  };
}
