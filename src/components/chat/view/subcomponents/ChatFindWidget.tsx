import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';

type ChatFindWidgetProps = {
  query: string;
  onQueryChange: (query: string) => void;
  matchCount: number;
  currentMatch: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

function ChatFindWidget({
  query,
  onQueryChange,
  matchCount,
  currentMatch,
  onNext,
  onPrev,
  onClose,
}: ChatFindWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className={cn(
        'sticky top-2 z-30 mx-3 flex items-center gap-1 rounded-lg border border-border/60',
        'bg-popover/95 backdrop-blur-sm shadow-lg',
        'px-2 py-1.5',
      )}
    >
      <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              onPrev();
            } else {
              onNext();
            }
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Find in conversation"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
      />

      {query.length > 0 && (
        <>
          <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
            {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : '0/0'}
          </span>

          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount === 0}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent/50 disabled:opacity-30"
            aria-label="Previous match"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent/50 disabled:opacity-30"
            aria-label="Next match"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent/50"
        aria-label="Close find"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default React.memo(ChatFindWidget);
