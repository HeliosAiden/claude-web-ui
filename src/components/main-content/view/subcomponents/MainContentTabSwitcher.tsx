import React from 'react';
import { MessageSquare, Terminal, FolderOpen, GitBranch } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { AppTab } from '../../../../types/app';

type MainContentTabSwitcherProps = {
  activeTab: AppTab;
  onTabSelect: (tab: AppTab) => void;
};

const TABS: { id: AppTab; icon: typeof MessageSquare; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'shell', icon: Terminal, label: 'Shell' },
  { id: 'files', icon: FolderOpen, label: 'Files' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
];

function MainContentTabSwitcher({ activeTab, onTabSelect }: MainContentTabSwitcherProps) {
  return (
    <div className="flex items-center gap-1 h-11 px-3 border-b border-border/40 bg-card/50 flex-shrink-0" role="tablist" aria-label="Workspace mode">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id || (tab.id === 'git' && activeTab === 'git');
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabSelect(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'bg-accent/50 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
            )}
          >
            <tab.icon
              className={cn('h-4 w-4 transition-transform', isActive && 'scale-105')}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(MainContentTabSwitcher);
