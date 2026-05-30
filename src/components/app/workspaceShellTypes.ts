import type { ReactNode } from 'react';

import type { ActivityId } from '../../types/app';
import type { ActivityBarItemDef } from '../activity-bar/types';

export type WorkspaceShellProps = {
  isMobile: boolean;
  /** ActivityBar state */
  activeActivity: ActivityId;
  onActivitySelect: (id: ActivityId) => void;
  onShowSettings: () => void;
  pluginActivities: ActivityBarItemDef[];
  /** Sidebar / ProjectsFlyout */
  flyoutOpen: boolean;
  setFlyoutOpen: (open: boolean) => void;
  sidebarContent: ReactNode;
  /** MainContent */
  mainContent: ReactNode;
};
