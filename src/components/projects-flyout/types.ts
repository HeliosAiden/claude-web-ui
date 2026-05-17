import type { ReactNode } from 'react';

export type ProjectsFlyoutProps = {
  mode: 'overlay' | 'pinned';
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
};
