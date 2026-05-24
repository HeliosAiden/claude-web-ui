import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { grantClaudeToolPermission } from '../utils/chatPermissions';
import type { LLMProvider, ProjectSession } from '../../../types/app';
import type { PendingPermissionRequest } from '../types/types';

interface PendingViewSession {
  sessionId: string | null;
  startedAt: number;
}

interface UseChatActionsArgs {
  canAbortSession: boolean;
  currentSessionId: string | null;
  pendingViewSessionRef: { current: PendingViewSession | null };
  provider: LLMProvider;
  sendMessage: (message: unknown) => void;
  selectedSession: ProjectSession | null;
  setPendingPermissionRequests: Dispatch<SetStateAction<PendingPermissionRequest[]>>;
  setClaudeStatus: (status: { text: string; tokens: number; can_interrupt: boolean } | null) => void;
}

export function useChatActions({
  canAbortSession,
  currentSessionId,
  pendingViewSessionRef,
  provider,
  sendMessage,
  selectedSession,
  setPendingPermissionRequests,
  setClaudeStatus,
}: UseChatActionsArgs) {
  const handleAbortSession = useCallback(() => {
    if (!canAbortSession) return;

    const pendingSessionId =
      typeof window !== 'undefined' ? sessionStorage.getItem('pendingSessionId') : null;
    const cursorSessionId =
      typeof window !== 'undefined' ? sessionStorage.getItem('cursorSessionId') : null;

    const candidateSessionIds = [
      currentSessionId,
      pendingViewSessionRef.current?.sessionId || null,
      pendingSessionId,
      provider === 'cursor' ? cursorSessionId : null,
      selectedSession?.id || null,
    ];

    const targetSessionId = candidateSessionIds.find((sessionId) => Boolean(sessionId)) || null;

    if (!targetSessionId) {
      console.warn('Abort requested but no concrete session ID is available yet.');
      return;
    }

    sendMessage({
      type: 'abort-session',
      sessionId: targetSessionId,
      provider,
    });
  }, [canAbortSession, currentSessionId, pendingViewSessionRef, provider, selectedSession?.id, sendMessage]);

  const handleGrantToolPermission = useCallback(
    (suggestion: { entry: string; toolName: string }) => {
      if (!suggestion || provider !== 'claude') {
        return { success: false };
      }
      return grantClaudeToolPermission(suggestion.entry);
    },
    [provider],
  );

  const handlePermissionDecision = useCallback(
    (
      requestIds: string | string[],
      decision: { allow?: boolean; message?: string; rememberEntry?: string | null; updatedInput?: unknown },
    ) => {
      const ids = Array.isArray(requestIds) ? requestIds : [requestIds];
      const validIds = ids.filter(Boolean);
      if (validIds.length === 0) return;

      validIds.forEach((requestId) => {
        sendMessage({
          type: 'claude-permission-response',
          requestId,
          allow: Boolean(decision?.allow),
          updatedInput: decision?.updatedInput,
          message: decision?.message,
          rememberEntry: decision?.rememberEntry,
        });
      });

      setPendingPermissionRequests((previous) => {
        const next = previous.filter((request) => !validIds.includes(request.requestId));
        if (next.length === 0) {
          setClaudeStatus(null);
        }
        return next;
      });
    },
    [sendMessage, setClaudeStatus, setPendingPermissionRequests],
  );

  return {
    handleAbortSession,
    handleGrantToolPermission,
    handlePermissionDecision,
  };
}
