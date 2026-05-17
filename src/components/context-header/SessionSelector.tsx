import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SessionSelectorProps } from './types';

function SessionSelector({ sessions, selectedSession, onSessionSelect, visible }: SessionSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (session: typeof sessions[0]) => {
      onSessionSelect(session);
      setOpen(false);
    },
    [onSessionSelect],
  );

  const sessionLabel = useMemo(() => {
    if (!selectedSession) return 'New Session';
    return selectedSession.summary || selectedSession.name || selectedSession.title || 'Untitled';
  }, [selectedSession]);

  if (!visible) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2 rounded-md text-sm',
          'hover:bg-accent/50 transition-colors',
          'border border-transparent hover:border-border/60',
          open && 'bg-accent/50 border-border/60',
          !selectedSession && 'text-muted-foreground italic',
        )}
      >
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="max-w-[160px] truncate">{sessionLabel}</span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && sessions.length > 0 && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close session selector"
          />
          <div className="absolute left-0 top-full mt-1 z-40 w-72 rounded-lg border border-border/50 bg-popover shadow-lg">
            <div className="max-h-72 overflow-y-auto py-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleSelect(session)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    'hover:bg-accent/60',
                    selectedSession?.id === session.id && 'bg-accent/40 font-medium',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      {session.summary || session.name || 'Untitled Session'}
                    </p>
                    {session.__provider && (
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {session.__provider}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {open && sessions.length === 0 && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close session selector"
          />
          <div className="absolute left-0 top-full mt-1 z-40 w-56 rounded-lg border border-border/50 bg-popover shadow-lg">
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No sessions available
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(SessionSelector);
