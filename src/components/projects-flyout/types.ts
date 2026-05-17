import type { ReactNode } from 'react';

export type ProjectsFlyoutProps = {
  mode: 'overlay' | 'sidebar';
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
};
