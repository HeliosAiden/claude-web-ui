import { create } from 'zustand';

export interface MobileClaudeStatusData {
  text?: string;
  tokens?: number;
  can_interrupt?: boolean;
}

interface MobileStatusState {
  isLoading: boolean;
  status: MobileClaudeStatusData | null;
  provider: string;
  onAbort: (() => void) | null;
}

interface MobileStatusActions {
  sync: (data: {
    isLoading: boolean;
    status: MobileClaudeStatusData | null;
    provider: string;
    onAbort: (() => void) | null;
  }) => void;
}

type MobileStatusStore = MobileStatusState & MobileStatusActions;

export const useMobileStatusStore = create<MobileStatusStore>((set) => ({
  isLoading: false,
  status: null,
  provider: 'claude',
  onAbort: null,

  sync: (data) => set(data),
}));
