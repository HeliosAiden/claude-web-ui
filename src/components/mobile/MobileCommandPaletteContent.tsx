import * as React from 'react';
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
} from '../../shared/view/ui';
import type { AppTab } from '../../types/app';
import { SETTINGS_MAIN_TABS } from '../settings/constants/constants';
import type { Page } from '../../hooks/useMobileCommandPalette';
import { NAV_TABS } from '../../hooks/useMobileCommandPalette';

interface SnippetRow {
  id: string;
  label: string;
  provider?: string;
  snippet?: string;
}

interface MobileCommandPaletteContentProps {
  search: string;
  onSearchChange: (value: string) => void;
  page?: Page;
  pages: Page[];
  onPushPage: (page: Page) => void;
  onPopPage: () => void;
  onClose: () => void;
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

const PAGE_LABELS_MAP: Record<Page, string> = {
  actions: 'Actions',
  files: 'Files',
  sessions: 'Sessions',
  commits: 'Commits',
  branches: 'Branches',
};

function BrowseAllItem({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <CommandItem value={label} onSelect={onSelect}>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 text-muted-foreground">{label}</span>
    </CommandItem>
  );
}

export default function MobileCommandPaletteContent({
  search,
  onSearchChange,
  page,
  pages: _pages,
  onPushPage,
  onPopPage,
  onClose,
  onKeyDown,
  sessions: allSessions,
  files: allFiles,
  commits: allCommits,
  branches: allBranches,
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
}: MobileCommandPaletteContentProps) {
  const run = React.useCallback(
    (fn: () => void) => {
      onClose();
      fn();
    },
    [onClose],
  );

  const startNewChatDisabled = !selectedProject;
  const browseLimit = 5;

  return (
    <Command
      label="Command palette"
      onKeyDown={onKeyDown}
      className="flex h-full flex-col"
      shouldFilter={false}
    >
      {/* Breadcrumb */}
      {page && (
        <div className="flex items-center gap-2 px-4 pb-1 pt-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {PAGE_LABELS_MAP[page]}
            <button
              type="button"
              onClick={onPopPage}
              aria-label="Back to all"
              className="ml-0.5 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {/* Search input */}
      <div className="sticky top-0 z-10 bg-card px-4 pb-2">
        <CommandInput
          placeholder={
            page
              ? `Search ${PAGE_LABELS_MAP[page].toLowerCase()}…`
              : 'Search anything…'
          }
          value={search}
          onValueChange={onSearchChange}
          className="h-12 text-base"
          showIcon={true}
        />
      </div>

      {/* Results */}
      <CommandList className="flex-1 overflow-y-auto px-2 pb-4">
        <CommandEmpty>No results.</CommandEmpty>

        {showActions && (
          <CommandGroup heading="Actions">
            <CommandItem
              value="Start new chat"
              disabled={startNewChatDisabled}
              onSelect={() => {
                if (!selectedProject) return;
                run(() => onStartNewChat(selectedProject));
              }}
              className="min-h-[52px]"
            >
              <MessageSquarePlus className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Start new chat</span>
              {startNewChatDisabled && (
                <span className="text-xs text-muted-foreground">Select a project first</span>
              )}
            </CommandItem>
            <CommandItem
              value="Open settings"
              onSelect={() => run(() => onOpenSettings())}
              className="min-h-[52px]"
            >
              <Settings className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Open settings</span>
            </CommandItem>
            <CommandItem
              value="Toggle theme dark light mode"
              onSelect={() => run(toggleDarkMode)}
              className="min-h-[52px]"
            >
              <SunMoon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Toggle theme</span>
            </CommandItem>
          </CommandGroup>
        )}

        {showActions && (
          <CommandGroup heading="Navigate">
            {NAV_TABS.map((tab: { id: AppTab; label: string; keywords: string }) => (
              <CommandItem
                key={tab.id as string}
                value={`${tab.label} ${tab.keywords}`}
                onSelect={() => run(() => navigateToTab(tab.id === 'shell' ? 'chat' : tab.id as any))}
                className="min-h-[52px]"
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
              onSelect={() => run(() => { void git.fetch(); navigateToTab('git'); })}
              className="min-h-[52px]"
            >
              <RefreshCw className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Git: Fetch</span>
            </CommandItem>
            <CommandItem
              value="Git Pull merge upstream"
              onSelect={() => run(() => { void git.pull(); navigateToTab('git'); })}
              className="min-h-[52px]"
            >
              <ArrowDownToLine className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1">Git: Pull</span>
            </CommandItem>
            <CommandItem
              value="Git Push origin remote"
              onSelect={() => run(() => { void git.push(); navigateToTab('git'); })}
              className="min-h-[52px]"
            >
              <ArrowUpFromLine className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
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
                onSelect={() => run(() => onOpenSettings(id))}
                className="min-h-[52px]"
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
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
                onSelect={() => run(() => navigate(`/session/${s.id}`))}
                className="min-h-[52px]"
              >
                <MessageSquare className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{s.label}</span>
                  {s.snippet && (
                    <span className="truncate text-xs text-muted-foreground">{s.snippet}</span>
                  )}
                </div>
                {s.provider && (
                  <span className="text-xs text-muted-foreground">{s.provider}</span>
                )}
              </CommandItem>
            ))}
            {!page && allSessions.length > browseLimit && (
              <BrowseAllItem
                label={`Browse all sessions (${allSessions.length})`}
                onSelect={() => onPushPage('sessions')}
              />
            )}
          </CommandGroup>
        )}

        {showFiles && projectId && filesShown.length > 0 && (
          <CommandGroup heading="Files">
            {filesShown.map((f) => (
              <CommandItem
                key={f.path}
                value={f.path}
                onSelect={() => run(() => ops.openFile(f.path))}
                className="min-h-[52px]"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate font-medium">{f.name}</span>
                <span className="truncate text-xs text-muted-foreground">{f.path}</span>
              </CommandItem>
            ))}
            {!page && allFiles.length > browseLimit && (
              <BrowseAllItem
                label={`Browse all files (${allFiles.length})`}
                onSelect={() => onPushPage('files')}
              />
            )}
          </CommandGroup>
        )}

        {showCommits && projectId && commitsShown.length > 0 && (
          <CommandGroup heading="Commits">
            {commitsShown.map((c) => (
              <CommandItem
                key={c.hash}
                value={`${c.message} ${c.author} ${c.shortHash}`}
                onSelect={() => run(() => navigateToTab('git'))}
                className="min-h-[52px]"
              >
                <GitCommit className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-mono text-xs text-muted-foreground">{c.shortHash}</span>
                <span className="flex-1 truncate">{c.message}</span>
                <span className="truncate text-xs text-muted-foreground">{c.author}</span>
              </CommandItem>
            ))}
            {!page && allCommits.length > browseLimit && (
              <BrowseAllItem
                label={`Browse all commits (${allCommits.length})`}
                onSelect={() => onPushPage('commits')}
              />
            )}
          </CommandGroup>
        )}

        {showBranches && projectId && branchesShown.length > 0 && (
          <CommandGroup heading="Branches">
            {branchesShown.map((b) => (
              <CommandItem
                key={`branch-${b.name}`}
                value={b.name}
                onSelect={() => run(() => { void git.checkout(b.name); navigateToTab('git'); })}
                className="min-h-[52px]"
              >
                <GitMerge className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">Switch to: {b.name}</span>
              </CommandItem>
            ))}
            {!page && allBranches.length > browseLimit && (
              <BrowseAllItem
                label={`Browse all branches (${allBranches.length})`}
                onSelect={() => onPushPage('branches')}
              />
            )}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
