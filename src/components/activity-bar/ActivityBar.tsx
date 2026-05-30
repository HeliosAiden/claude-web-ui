import React, { useMemo } from 'react';
import {
  Bookmark,
  File,
  FileText,
  Folder,
  GitBranch,
  Search,
  Settings,
} from 'lucide-react';

import type { ActivityId } from '../../types/app';

import ActivityBarItem from './ActivityBarItem';
import type { ActivityBarItemDef, ActivityBarProps } from './types';

const BUILT_IN_ITEMS: Omit<ActivityBarItemDef, 'id'>[] = [
  { icon: Folder, label: 'Projects & sessions', shortcut: 'Ctrl+E' },
  { icon: Bookmark, label: 'Bookmarks', shortcut: 'Ctrl+B' },
  { icon: Search, label: 'Search', shortcut: 'Ctrl+K' },
  { icon: File, label: 'Files', shortcut: 'Ctrl+F' },
  { icon: GitBranch, label: 'Source Control', shortcut: 'Ctrl+G' },
  { icon: FileText, label: 'Prompt Templates', shortcut: 'Ctrl+P' },
];

function ActivityBar({
  activeActivity,
  onActivitySelect,
  updateAvailable,
  onShowSettings,
  pluginActivities,
}: ActivityBarProps) {
  const items = useMemo<ActivityBarItemDef[]>(() => {
    const list: ActivityBarItemDef[] = [
      { ...BUILT_IN_ITEMS[0], id: 'explorer' as ActivityId },
      { ...BUILT_IN_ITEMS[1], id: 'bookmarks' as ActivityId },
      { ...BUILT_IN_ITEMS[2], id: 'search' as ActivityId },
      { ...BUILT_IN_ITEMS[3], id: 'files' as ActivityId },
      { ...BUILT_IN_ITEMS[4], id: 'git' as ActivityId },
      { ...BUILT_IN_ITEMS[5], id: 'templates' as ActivityId },
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
      className="flex h-full w-12 flex-shrink-0 flex-col border-r border-border/50 bg-card"
      role="navigation"
      aria-label="Workspace navigation"
    >
      {items.map((item) => (
        <ActivityBarItem
          key={item.id}
          item={item}
          isActive={activeActivity === item.id}
          onClick={() => handleItemClick(item)}
          isMobile={false}
        />
      ))}
      <div className="mt-auto">
        <ActivityBarItem
          item={settingsItem}
          isActive={false}
          onClick={() => handleItemClick(settingsItem)}
          isMobile={false}
        />
      </div>
    </div>
  );
}

export default React.memo(ActivityBar);
