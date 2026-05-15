import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import SessionProviderLogo from '../../../llm-logo-provider/SessionProviderLogo';
import type { OpenSessionInfo } from '../../../../hooks/useOpenSessionTabs';

type SessionTabBarProps = {
  openSessions: OpenSessionInfo[];
  selectedSessionId: string | null;
  processingSessions: Set<string>;
  errorSessions: Set<string>;
  onSelectTab: (sessionId: string) => void;
  onCloseTab: (sessionId: string) => void;
};

export default function SessionTabBar({
  openSessions,
  selectedSessionId,
  processingSessions,
  errorSessions,
  onSelectTab,
  onCloseTab,
}: SessionTabBarProps) {
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
    <div className="relative flex-shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="scrollbar-hide flex items-center overflow-x-auto"
      >
        {openSessions.map((session) => {
          const isActive = session.id === selectedSessionId;
          const isProcessing = processingSessions.has(session.id);
          const isError = errorSessions.has(session.id);

          let dotColor = 'bg-amber-400';
          if (isError) {
            dotColor = 'bg-red-500';
          } else if (isProcessing) {
            dotColor = 'bg-green-500';
          }

          return (
            <div
              key={session.id}
              className={`group relative flex h-9 flex-shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-100 ${
                isActive
                  ? 'border-primary bg-muted/40 text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
              onClick={() => onSelectTab(session.id)}
            >
              <SessionProviderLogo
                provider={session.provider}
                className="h-3.5 w-3.5 flex-shrink-0"
              />

              <span className="max-w-[140px] truncate">{session.title}</span>

              <span
                className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColor}`}
              />

              <button
                className="ml-0.5 flex-shrink-0 rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(session.id);
                }}
                aria-label={`Close ${session.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
}
