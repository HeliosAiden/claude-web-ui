import { createContext, useContext } from 'react';

import type { LLMProvider } from '../types/app';
import type { ProviderAuthStatusMap } from '../components/provider-auth/types';

export interface ChatProviderContextValue {
  provider: LLMProvider;
  setProvider: (provider: LLMProvider) => void;
  claudeModel: string;
  setClaudeModel: (model: string) => void;
  cursorModel: string;
  setCursorModel: (model: string) => void;
  codexModel: string;
  setCodexModel: (model: string) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
  fccModels: { value: string; label: string }[];
  providerAuthStatus: ProviderAuthStatusMap;
  permissionMode: string;
  cyclePermissionMode: () => void;
}

const ChatProviderContext = createContext<ChatProviderContextValue | null>(null);

export function useChatProviderContext(): ChatProviderContextValue {
  const ctx = useContext(ChatProviderContext);
  if (!ctx) throw new Error('useChatProviderContext must be used within ChatProviderContext.Provider');
  return ctx;
}

export default ChatProviderContext;
