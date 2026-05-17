import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityId } from '../../types/app';

export type ActivityBarItemDef = {
  id: ActivityId;
  icon: LucideIcon;
  label: string;
  badge?: number | string;
  customIcon?: ReactNode;
};

export type ActivityBarProps = {
  activeActivity: ActivityId;
  onActivitySelect: (id: ActivityId) => void;
  isMobile: boolean;
  flyoutOpen: boolean;
  onToggleFlyout: () => void;
  updateAvailable?: boolean;
  onShowSettings: () => void;
  pluginActivities: ActivityBarItemDef[];
};

export type ActivityBarItemProps = {
  item: ActivityBarItemDef;
  isActive: boolean;
  onClick: () => void;
  isMobile: boolean;
  hasFlyoutIndicator?: boolean;
  flyoutOpen?: boolean;
};
