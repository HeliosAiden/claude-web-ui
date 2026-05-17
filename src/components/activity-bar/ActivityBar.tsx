import React, { useMemo } from 'react';
import {
  Bookmark,
  Folder,
  Search,
  Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ActivityId } from '../../types/app';
import ActivityBarItem from './ActivityBarItem';
import type { ActivityBarItemDef, ActivityBarProps } from './types';

const BUILT_IN_ITEMS: Omit<ActivityBarItemDef, 'id'>[] = [
  { icon: Folder, label: 'Explorer', shortcut: 'Ctrl+E' },
  { icon: Bookmark, label: 'Bookmarks', shortcut: 'Ctrl+B' },
  { icon: Search, label: 'Search', shortcut: 'Ctrl+K' },
];

function ActivityBar({
  activeActivity,
  onActivitySelect,
  isMobile,
  updateAvailable,
  onShowSettings,
  pluginActivities,
}: ActivityBarProps) {
  const items = useMemo<ActivityBarItemDef[]>(() => {
    const list: ActivityBarItemDef[] = [
      { ...BUILT_IN_ITEMS[0], id: 'explorer' as ActivityId },
      { ...BUILT_IN_ITEMS[1], id: 'bookmarks' as ActivityId },
      { ...BUILT_IN_ITEMS[2], id: 'search' as ActivityId },
      ...pluginActivities,
    ];
    return list;
  }, [pluginActivities]);

  const handleItemClick = (item: ActivityBarItemDef) => {
    if (item.id === 'settings') {
      onShowSettings();
    } else {
      onActivitySelect(item.id);
    }
  };

  const settingsItem: ActivityBarItemDef = {
    id: 'settings',
    icon: Settings,
    label: 'Settings',
    badge: updateAvailable ? '!' : undefined,
  };

  return (
    <div
      className={cn(
        'flex bg-card border-border/50',
        isMobile
          ? cn(
              'fixed bottom-0 inset-x-0 flex-row items-center justify-around',
              'h-[52px]',
              'border-t',
              'pb-[env(safe-area-inset-bottom,0px)]',
              'z-30',
            )
          : cn(
              'flex-col h-full w-12 flex-shrink-0',
              'border-r',
            ),
      )}
      role="navigation"
      aria-label="Workspace navigation"
    >
      {/* Main activity items */}
      {items.map((item) => (
        <ActivityBarItem
          key={item.id}
          item={item}
          isActive={activeActivity === item.id}
          onClick={() => handleItemClick(item)}
          isMobile={isMobile}
        />
      ))}

      {/* Settings at bottom (desktop) or inline (mobile) */}
      <div className={cn(isMobile ? '' : 'mt-auto')}>
        <ActivityBarItem
          item={settingsItem}
          isActive={false}
          onClick={() => handleItemClick(settingsItem)}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}

export default React.memo(ActivityBar);
