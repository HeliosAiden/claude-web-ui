import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  FileText,
  GitCommit,
  GitMerge,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Settings,
  SunMoon,
  X,
} from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../../shared/view/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { usePaletteOps } from '../../../../contexts/PaletteOpsContext';
import { SETTINGS_MAIN_TABS } from '../../../settings/constants/constants';
import { useSessionsSource } from '../../../command-palette/sources/useSessionsSource';
import { useFilesSource } from '../../../command-palette/sources/useFilesSource';
import { useCommitsSource } from '../../../command-palette/sources/useCommitsSource';
import { useSessionMessageSearch } from '../../../command-palette/sources/useSessionMessageSearch';
import { useBranchesSource } from '../../../command-palette/sources/useBranchesSource';
import { useGitActions } from '../../../command-palette/sources/useGitActions';
import type { AppTab, Project } from '../../../../types/app';

type Page = 'actions' | 'files' | 'sessions' | 'commits' | 'branches';

const PAGE_LABELS: Record<Page, string> = {
  actions: 'Actions',
  files: 'Files',
  sessions: 'Sessions',
  commits: 'Commits',
  branches: 'Branches',
};

const NAV_TABS: Array<{ id: AppTab; label: string; keywords: string }> = [
  { id: 'chat', label: 'Go to Chat', keywords: 'chat messages conversation' },
  { id: 'files', label: 'Go to Files', keywords: 'files file tree explorer' },
  { id: 'shell', label: 'Go to Shell', keywords: 'shell terminal console' },
  { id: 'git', label: 'Go to Git', keywords: 'git diff branches' },
];

type SidebarSearchPanelProps = {
  selectedProject: Project | null;
  onNewSession: (project: Project) => void;
  onShowSettings: (tab?: string) => void;
  onShowTab?: (tab: AppTab) => void;
  searchFilter: string;
};

export default function SidebarSearchPanel({
  selectedProject,
  onNewSession,
  onShowSettings,
  onShowTab,
  searchFilter,
}: SidebarSearchPanelProps) {
  const [pages, setPages] = useState<Page[]>([]);
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

  const sessions = useSessionsSource(projectId, showSessions);
  const messageMatches = useSessionMessageSearch(projectId, searchFilter, showSessions);
  const files = useFilesSource(projectId, showFiles);
  const commits = useCommitsSource(projectId, showCommits);
  const branches = useBranchesSource(projectId, showBranches);
  const git = useGitActions(projectId);

  const sessionRows = useMemo(() => {
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

  const pushPage = useCallback((next: Page) => {
    setPages((prev) => [...prev, next]);
  }, []);

  const popPage = useCallback(() => {
    setPages((prev) => prev.slice(0, -1));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !searchFilter && pages.length > 0) {
      e.preventDefault();
      popPage();
    }
  }, [searchFilter, pages.length, popPage]);

  const startNewChatDisabled = !selectedProject;
  const browseLimit = 5;
  const filesShown = page === 'files' ? files : files.slice(0, browseLimit);
  const commitsShown = page === 'commits' ? commits : commits.slice(0, browseLimit);
  const sessionsShown = page === 'sessions' ? sessionRows : sessionRows.slice(0, browseLimit);
  const branchesShown = page === 'branches' ? branches : branches.slice(0, browseLimit);

  return (
    <Command label="Command palette" value={searchFilter} onKeyDown={handleKeyDown}>
      {page && (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {PAGE_LABELS[page]}
            <button
              type="button"
              onClick={popPage}
              aria-label="Back to all"
              className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
          <span className="text-xs text-muted-foreground">Backspace to go back</span>
        </div>
      )}
      <CommandInput
        placeholder={page ? `Search ${PAGE_LABELS[page].toLowerCase()}…` : 'Type to search anything…'}
        showIcon={false}
        className="hidden"
      />
      <CommandList className="max-h-full">
        <CommandEmpty>No results.</CommandEmpty>

        {showActions && (
          <CommandGroup heading="Actions">
            <CommandItem
              value="Start new chat"
              disabled={startNewChatDisabled}
              onSelect={() => {
                if (!selectedProject) return;
                onNewSession(selectedProject);
              }}
            >
              <MessageSquarePlus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Start new chat</span>
              {startNewChatDisabled && (
                <span className="text-xs text-muted-foreground">Select a project first</span>
              )}
            </CommandItem>
            <CommandItem value="Open settings" onSelect={() => onShowSettings()}>
              <Settings className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Open settings</span>
            </CommandItem>
            <CommandItem value="Toggle theme dark light mode" onSelect={toggleDarkMode}>
              <SunMoon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Toggle theme</span>
            </CommandItem>
          </CommandGroup>
        )}

        {showActions && (
          <CommandGroup heading="Navigate">
            {NAV_TABS.map((tab) => (
              <CommandItem
                key={tab.id as string}
                value={`${tab.label} ${tab.keywords}`}
                onSelect={() => onShowTab?.(tab.id)}
              >
                <span className="flex-1">{tab.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showActions && projectId && (
          <CommandGroup heading="Git">
            <CommandItem
              value="Git Fetch remote"
              onSelect={() => { void git.fetch(); onShowTab?.('git'); }}
            >
              <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Git: Fetch</span>
            </CommandItem>
            <CommandItem
              value="Git Pull merge upstream"
              onSelect={() => { void git.pull(); onShowTab?.('git'); }}
            >
              <ArrowDownToLine className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Git: Pull</span>
            </CommandItem>
            <CommandItem
              value="Git Push origin remote"
              onSelect={() => { void git.push(); onShowTab?.('git'); }}
            >
              <ArrowUpFromLine className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Git: Push</span>
            </CommandItem>
          </CommandGroup>
        )}

        {showActions && (
          <CommandGroup heading="Settings">
            {SETTINGS_MAIN_TABS.map(({ id, label, keywords, icon: Icon }) => (
              <CommandItem
                key={id}
                value={`Settings ${label} ${keywords}`}
                onSelect={() => onShowSettings(id)}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">Settings: {label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showSessions && projectId && sessionsShown.length > 0 && (
          <CommandGroup heading="Sessions">
            {sessionsShown.map((s) => (
              <CommandItem
                key={s.id}
                value={`${s.label} ${s.snippet ?? ''} ${s.id}`.trim()}
                onSelect={() => navigate(`/session/${s.id}`)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{s.label}</span>
                  {s.snippet && (
                    <span className="truncate text-xs text-muted-foreground">{s.snippet}</span>
                  )}
                </div>
                {s.provider && (
                  <span className="text-xs text-muted-foreground">{s.provider}</span>
                )}
              </CommandItem>
            ))}
            {!page && sessionRows.length > browseLimit && (
              <BrowseAllItem label={`Browse all sessions (${sessionRows.length})`} onSelect={() => pushPage('sessions')} />
            )}
          </CommandGroup>
        )}

        {showFiles && projectId && filesShown.length > 0 && (
          <CommandGroup heading="Files">
            {filesShown.map((f) => (
              <CommandItem
                key={f.path}
                value={f.path}
                onSelect={() => ops.openFile(f.path)}
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="truncate text-xs text-muted-foreground">{f.path}</span>
              </CommandItem>
            ))}
            {!page && files.length > browseLimit && (
              <BrowseAllItem label={`Browse all files (${files.length})`} onSelect={() => pushPage('files')} />
            )}
          </CommandGroup>
        )}

        {showCommits && projectId && commitsShown.length > 0 && (
          <CommandGroup heading="Commits">
            {commitsShown.map((c) => (
              <CommandItem
                key={c.hash}
                value={`${c.message} ${c.author} ${c.shortHash}`}
                onSelect={() => onShowTab?.('git')}
              >
                <GitCommit className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-mono text-xs text-muted-foreground">{c.shortHash}</span>
                <span className="flex-1 truncate">{c.message}</span>
                <span className="truncate text-xs text-muted-foreground">{c.author}</span>
              </CommandItem>
            ))}
            {!page && commits.length > browseLimit && (
              <BrowseAllItem label={`Browse all commits (${commits.length})`} onSelect={() => pushPage('commits')} />
            )}
          </CommandGroup>
        )}

        {showBranches && projectId && branchesShown.length > 0 && (
          <CommandGroup heading="Branches">
            {branchesShown.map((b) => (
              <CommandItem
                key={`branch-${b.name}`}
                value={b.name}
                onSelect={() => { void git.checkout(b.name); onShowTab?.('git'); }}
              >
                <GitMerge className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">Switch to: {b.name}</span>
              </CommandItem>
            ))}
            {!page && branches.length > browseLimit && (
              <BrowseAllItem label={`Browse all branches (${branches.length})`} onSelect={() => pushPage('branches')} />
            )}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

function BrowseAllItem({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <CommandItem value={label} onSelect={onSelect}>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 text-muted-foreground">{label}</span>
    </CommandItem>
  );
}
