import { useCallback, useEffect, useState } from 'react';

import type { LLMProvider } from '../types/app';

export interface OpenSessionInfo {
  id: string;
  title: string;
  provider?: LLMProvider;
}

const STORAGE_KEY = 'open-session-tabs';
const MAX_TABS = 20;

function loadFromStorage(): OpenSessionInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry: unknown): entry is OpenSessionInfo =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as OpenSessionInfo).id === 'string' &&
        typeof (entry as OpenSessionInfo).title === 'string',
    );
  } catch {
    return [];
  }
}

function saveToStorage(sessions: OpenSessionInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useOpenSessionTabs() {
  const [openSessions, setOpenSessions] = useState<OpenSessionInfo[]>(loadFromStorage);
  const [errorSessions, setErrorSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    saveToStorage(openSessions);
  }, [openSessions]);

  const addOpenSession = useCallback(
    (id: string, title?: string, provider?: LLMProvider) => {
      if (!id) return;
      setOpenSessions((prev) => {
        const existing = prev.findIndex((s) => s.id === id);
        const resolvedTitle = title || 'New Session';
        const resolvedProvider = provider || (prev.find((s) => s.id === id)?.provider as LLMProvider | undefined);

        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { id, title: resolvedTitle, provider: resolvedProvider };
          return updated;
        }

        const next = [...prev, { id, title: resolvedTitle, provider: resolvedProvider }];
        if (next.length > MAX_TABS) {
          return next.slice(next.length - MAX_TABS);
        }
        return next;
      });
      // Clear error state when session is re-added
      setErrorSessions((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [],
  );

  const removeOpenSession = useCallback((id: string) => {
    setOpenSessions((prev) => prev.filter((s) => s.id !== id));
    setErrorSessions((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateSessionTitle = useCallback(
    (id: string, title: string, provider?: LLMProvider) => {
      setOpenSessions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          if (s.title === title && (!provider || s.provider === provider)) return s;
          return { ...s, title, ...(provider ? { provider } : {}) };
        }),
      );
    },
    [],
  );

  const markSessionError = useCallback((id?: string | null) => {
    if (!id) return;
    setErrorSessions((prev) => {
      if (prev.has(id)) return prev;
      return new Set([...prev, id]);
    });
  }, []);

  const clearSessionError = useCallback((id?: string | null) => {
    if (!id) return;
    setErrorSessions((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    openSessions,
    errorSessions,
    addOpenSession,
    removeOpenSession,
    updateSessionTitle,
    markSessionError,
    clearSessionError,
  };
}
