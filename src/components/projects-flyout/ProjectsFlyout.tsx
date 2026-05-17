import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import type { ProjectsFlyoutProps } from './types';

function ProjectsFlyout({
  mode,
  children,
  isOpen,
  onClose,
  onTogglePin,
  isPinned,
}: ProjectsFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'overlay' && isOpen) {
        onClose();
      }
    },
    [mode, isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const pinProps = { onTogglePin, isPinned };

  // Pinned mode: in-flow panel
  if (mode === 'pinned') {
    return (
      <div
        ref={panelRef}
        className={cn(
          'h-full w-72 flex-shrink-0 border-r border-border/50 bg-card',
          'transition-all duration-250',
          isOpen ? 'ml-0' : '-ml-72',
        )}
      >
        {React.cloneElement(children as React.ReactElement<{ onTogglePin?: () => void; isPinned?: boolean }>, pinProps)}
      </div>
    );
  }

  // Overlay mode
  return (
    <div
      className={cn(
        'fixed inset-0 z-40',
        isOpen ? 'visible' : 'invisible',
      )}
    >
      {/* Backdrop */}
      <button
        className={cn(
          'absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        onTouchStart={(e) => {
          e.preventDefault();
          onClose();
        }}
        aria-label="Close sidebar"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-72 border-r border-border/40 bg-card',
          'transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {React.cloneElement(children as React.ReactElement<{ onTogglePin?: () => void; isPinned?: boolean }>, pinProps)}
      </div>
    </div>
  );
}

export default React.memo(ProjectsFlyout);
