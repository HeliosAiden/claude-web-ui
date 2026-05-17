import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import SessionProviderLogo from '../llm-logo-provider/SessionProviderLogo';

type SessionTabProps = {
  sessionId: string;
  title: string;
  provider: string;
  isActive: boolean;
  isProcessing: boolean;
  isError: boolean;
  onSelect: () => void;
  onClose: () => void;
};

function SessionTab({
  sessionId,
  title,
  provider,
  isActive,
  isProcessing,
  isError,
  onSelect,
  onClose,
}: SessionTabProps) {
  let dotColor = 'bg-amber-400';
  if (isError) {
    dotColor = 'bg-red-500';
  } else if (isProcessing) {
    dotColor = 'bg-green-500';
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex h-9 flex-shrink-0 cursor-pointer items-center gap-1.5 px-3 text-xs font-medium whitespace-nowrap transition-colors duration-100',
        isActive
          ? 'text-foreground bg-muted/30 session-tab-active'
          : 'text-muted-foreground hover:bg-accent/20 hover:text-foreground',
      )}
      aria-selected={isActive}
    >
      <SessionProviderLogo
        provider={provider}
        className="h-3.5 w-3.5 flex-shrink-0"
      />

      <span className="max-w-[140px] truncate">{title}</span>

      <span
        className={cn('inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full', dotColor)}
      />

      <span
        className="ml-0.5 flex-shrink-0 rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        role="button"
        aria-label={`Close ${title}`}
      >
        <X className="h-3 w-3" />
      </span>
    </button>
  );
}

export default React.memo(SessionTab);
