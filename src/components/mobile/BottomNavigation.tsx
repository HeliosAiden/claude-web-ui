import { useCallback } from 'react';
import {
  MessageSquare,
  File,
  MessageCircle,
  GitBranch,
  Settings,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import type { MobileTabId } from '../../types/mobile';

interface TabDefinition {
  id: MobileTabId;
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  label: string;
  requiresSession: boolean;
}

const TABS: TabDefinition[] = [
  { id: 'conversations', icon: MessageSquare, label: 'Chats', requiresSession: false },
  { id: 'files', icon: File, label: 'Files', requiresSession: true },
  { id: 'chat', icon: MessageCircle, label: 'Chat', requiresSession: false },
  { id: 'git', icon: GitBranch, label: 'Git', requiresSession: true },
  { id: 'settings', icon: Settings, label: 'Settings', requiresSession: false },
];

export const TAB_ORDER: MobileTabId[] = TABS.map((t) => t.id);

interface BottomNavigationProps {
  activeTab: MobileTabId;
  onTabSelect: (tab: MobileTabId) => void;
  onChatHubTap: () => void;
  hasActiveSession: boolean;
  sheetOpen: boolean;
}

export default function BottomNavigation({
  activeTab,
  onTabSelect,
  onChatHubTap,
  hasActiveSession,
  sheetOpen,
}: BottomNavigationProps) {
  const handleTabClick = useCallback(
    (tab: TabDefinition) => {
      if (tab.id === 'chat') {
        onChatHubTap();
        return;
      }
      if (tab.requiresSession && !hasActiveSession) return;
      onTabSelect(tab.id);
    },
    [onTabSelect, onChatHubTap, hasActiveSession],
  );

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 flex h-[52px] items-center justify-around border-t border-border/50 bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isChatHub = tab.id === 'chat';
        const isDisabled = tab.requiresSession && !hasActiveSession && !isActive;
        const Icon = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;

        if (isChatHub) {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              className="relative -mt-4 flex items-center justify-center"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-full transition-all duration-150',
                  'active:scale-90',
                  isActive || sheetOpen
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            disabled={isDisabled}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1.5 px-1 rounded-lg transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'mobile-touch-target',
              isActive
                ? 'text-primary'
                : isDisabled
                  ? 'text-muted-foreground/40'
                  : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-sm bg-primary" />
            )}
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} />
            <span className="max-w-full truncate text-[10px] font-medium leading-none">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
