import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { OpenSessionInfo } from '../../hooks/useOpenSessionTabs';
import SessionTab from './SessionTab';

type SessionTabsProps = {
  openSessions: OpenSessionInfo[];
  selectedSessionId: string | null;
  processingSessions: Set<string>;
  errorSessions: Set<string>;
  onSelectTab: (sessionId: string) => void;
  onCloseTab: (sessionId: string) => void;
  onNewSession?: () => void;
};

function SessionTabs({
  openSessions,
  selectedSessionId,
  processingSessions,
  errorSessions,
  onSelectTab,
  onCloseTab,
  onNewSession,
}: SessionTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState]);

  if (openSessions.length === 0) return null;

  return (
    <div className="relative flex-shrink-0 border-b border-border/30 bg-background/60">
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="scrollbar-hide flex items-center overflow-x-auto"
      >
        {openSessions.map((session) => (
          <SessionTab
            key={session.id}
            sessionId={session.id}
            title={session.title}
            provider={session.provider ?? ''}
            isActive={session.id === selectedSessionId}
            isProcessing={processingSessions.has(session.id)}
            isError={errorSessions.has(session.id)}
            onSelect={() => onSelectTab(session.id)}
            onClose={() => onCloseTab(session.id)}
          />
        ))}
      </div>

      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />
      )}

      {/* New session button */}
      {onNewSession && (
        <button
          type="button"
          onClick={onNewSession}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          aria-label="New session"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default React.memo(SessionTabs);
