import type { LucideIcon } from 'lucide-react';

export type MobileTabId = 'conversations' | 'files' | 'chat' | 'git' | 'settings';

export interface MobileNavTab {
  id: MobileTabId;
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  label: string;
  route: string;
  requiresSession: boolean;
}

export interface BottomSheetAction {
  id: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  onTap: () => void;
}
