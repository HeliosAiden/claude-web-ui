import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

const SHEET_TARGET = '40vh';
const DISMISS_THRESHOLD = 0.3;

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    dragCurrentY.current = e.touches[0].clientY;
    setDragOffset(Math.max(0, dragCurrentY.current - dragStartY.current));
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    const sheetHeight = sheetRef.current?.offsetHeight ?? window.innerHeight * 0.4;
    if (dragOffset / sheetHeight > DISMISS_THRESHOLD) {
      onClose();
    }
    setDragOffset(0);
  }, [dragOffset, onClose]);

  const handleBackdropTap = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen && dragOffset === 0) return null;

  const translateY = isDragging
    ? `${dragOffset}px`
    : isOpen
      ? '0px'
      : '100%';

  const transitionClass = isDragging ? '' : 'transition-[transform] duration-400';

  return (
    <div className="fixed inset-0 z-40 flex items-end" onMouseDown={handleBackdropTap}>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm',
          !isDragging && 'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'relative w-full bg-card rounded-t-2xl border-t border-border/50 shadow-xl',
          'flex flex-col',
          transitionClass,
        )}
        style={{
          transform: `translateY(${translateY})`,
          maxHeight: SHEET_TARGET,
          marginBottom: 'var(--keyboard-height, 0px)',
          transitionTimingFunction: isDragging ? 'linear' : 'cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-3 touch-none bottom-sheet-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
