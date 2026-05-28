import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedRouteTransitionsProps {
  children: ReactNode;
  locationKey: string;
  direction?: 'forward' | 'backward';
}

export default function AnimatedRouteTransitions({
  children,
  locationKey,
  direction = 'forward',
}: AnimatedRouteTransitionsProps) {
  const childrenRef = useRef<ReactNode>(null);
  const prevKeyRef = useRef(locationKey);
  const [exitingChildren, setExitingChildren] = useState<ReactNode | null>(null);

  useEffect(() => {
    if (locationKey === prevKeyRef.current) return;

    // Capture previous children for exit animation
    setExitingChildren(childrenRef.current);
    prevKeyRef.current = locationKey;

    const timer = setTimeout(() => {
      setExitingChildren(null);
    }, 300);

    return () => clearTimeout(timer);
  }, [locationKey]);

  // Always keep ref in sync
  childrenRef.current = children;

  if (!exitingChildren) {
    return (
      <div key={locationKey} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  const exitAnimation =
    direction === 'forward' ? 'animate-slide-out-left' : 'animate-slide-out-right';
  const enterAnimation =
    direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={cn('absolute inset-0 z-10 pointer-events-none', exitAnimation)}>
        {exitingChildren}
      </div>
      <div className={cn('absolute inset-0 z-20', enterAnimation)}>
        {children}
      </div>
    </div>
  );
}
