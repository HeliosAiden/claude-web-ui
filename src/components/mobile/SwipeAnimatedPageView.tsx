import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { MobileTabId } from '../../types/mobile';

interface SwipeAnimatedPageViewProps {
  activeTab: MobileTabId;
  onTabChange: (tab: MobileTabId) => void;
  pages: Record<MobileTabId, ReactNode>;
  tabOrder: MobileTabId[];
}

const SWIPE_THRESHOLD = 0.25; // 25% of container width to commit
const ANGLE_THRESHOLD = 30;   // degrees from horizontal — past this = treat as vertical scroll

function getAngle(dx: number, dy: number): number {
  if (dx === 0) return 90;
  return (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
}

/**
 * Full-screen swipeable page view for mobile bottom tabs.
 *
 * Renders current, previous, and next pages in an absolute-positioned strip.
 * A touch drag translates the strip in real-time. On release past the 25%
 * threshold, it snaps to the adjacent tab; otherwise it snaps back.
 *
 * Vertical scroll (angle > 30°) is let through to the browser default.
 */
export default function SwipeAnimatedPageView({
  activeTab,
  onTabChange,
  pages,
  tabOrder,
}: SwipeAnimatedPageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isVerticalScrollRef = useRef(false);

  const [swipeState, setSwipeState] = useState<{
    offset: number;          // current translateX in px
    isDragging: boolean;
    isAnimating: boolean;    // snap-back or snap-forward in progress
  }>({ offset: 0, isDragging: false, isAnimating: false });

  // Show adjacent pages only while actively swiping or snapping
  const [showPrev, setShowPrev] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const currentIndex = tabOrder.indexOf(activeTab);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < tabOrder.length - 1;
  const prevTab = hasPrev ? tabOrder[currentIndex - 1] : null;
  const nextTab = hasNext ? tabOrder[currentIndex + 1] : null;

  /* ── Touch handlers ── */

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (swipeState.isAnimating) return;
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      isVerticalScrollRef.current = false;
    },
    [swipeState.isAnimating],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (swipeState.isAnimating) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;

      // Decide direction once we have enough movement
      if (!isVerticalScrollRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        const angle = getAngle(dx, dy);
        if (angle > ANGLE_THRESHOLD) {
          isVerticalScrollRef.current = true;
          return; // let browser handle vertical scroll
        }
        e.preventDefault();
      }

      if (isVerticalScrollRef.current) return;

      e.preventDefault();

      // Bouncy resistance at edge tabs (first / last)
      let offset = dx;
      if (!hasPrev && offset > 0) offset = offset * 0.3;
      if (!hasNext && offset < 0) offset = offset * 0.3;

      setSwipeState((prev) => ({ ...prev, offset, isDragging: true }));
      setShowPrev(hasPrev && offset > 0);
      setShowNext(hasNext && offset < 0);
    },
    [swipeState.isAnimating, hasPrev, hasNext],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (swipeState.isAnimating || isVerticalScrollRef.current) {
        isVerticalScrollRef.current = false;
        return;
      }

      const containerWidth = containerRef.current?.clientWidth || 1;
      const dx = swipeState.offset;
      const ratio = dx / containerWidth;
      const absRatio = Math.abs(ratio);

      if (absRatio > SWIPE_THRESHOLD && ((dx > 0 && hasPrev) || (dx < 0 && hasNext))) {
        // Commit — snap to adjacent tab
        const targetTab = dx > 0 ? prevTab! : nextTab!;
        const targetOffset = dx > 0 ? containerWidth : -containerWidth;

        setSwipeState((prev) => ({
          ...prev,
          offset: targetOffset,
          isDragging: false,
          isAnimating: true,
        }));

        setTimeout(() => {
          setSwipeState({ offset: 0, isDragging: false, isAnimating: false });
          setShowPrev(false);
          setShowNext(false);
          onTabChange(targetTab);
        }, 250);
      } else {
        // Revert — snap back to current tab
        setSwipeState((prev) => ({
          ...prev,
          offset: 0,
          isDragging: false,
          isAnimating: true,
        }));
        setTimeout(() => {
          setSwipeState((prev) => ({
            ...prev,
            isAnimating: false,
          }));
          setShowPrev(false);
          setShowNext(false);
        }, 200);
      }
    },
    [swipeState, hasPrev, hasNext, prevTab, nextTab, onTabChange],
  );

  /* ── Reset when activeTab changes externally ── */

  useEffect(() => {
    setSwipeState({ offset: 0, isDragging: false, isAnimating: false });
    setShowPrev(false);
    setShowNext(false);
  }, [activeTab]);

  /* ── Render ── */

  const slideTransition = swipeState.isAnimating && !swipeState.isDragging
    ? 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)'
    : 'none';

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Translating strip holding prev / current / next */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${swipeState.offset}px)`,
          transition: slideTransition,
        }}
      >
        {/* Previous page */}
        <div
          className="absolute bottom-0 top-0"
          style={{
            left: '-100%',
            width: '100%',
            pointerEvents: showPrev ? 'auto' : 'none',
            visibility: showPrev ? 'visible' : 'hidden',
          }}
        >
          {showPrev && prevTab ? pages[prevTab] : null}
        </div>

        {/* Current page */}
        <div className="absolute bottom-0 left-0 top-0 w-full">
          {pages[activeTab]}
        </div>

        {/* Next page */}
        <div
          className="absolute bottom-0 top-0"
          style={{
            left: '100%',
            width: '100%',
            pointerEvents: showNext ? 'auto' : 'none',
            visibility: showNext ? 'visible' : 'hidden',
          }}
        >
          {showNext && nextTab ? pages[nextTab] : null}
        </div>
      </div>
    </div>
  );
}
