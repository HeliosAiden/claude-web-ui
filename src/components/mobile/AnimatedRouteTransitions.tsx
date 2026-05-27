import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedRouteTransitionsProps {
  children: ReactNode;
  locationKey: string;
}

export default function AnimatedRouteTransitions({
  children,
  locationKey,
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          'absolute inset-0 z-10 pointer-events-none',
          'animate-slide-out-left',
        )}
      >
        {exitingChildren}
      </div>
      <div
        className={cn(
          'absolute inset-0 z-20',
          'animate-slide-in-right',
        )}
      >
        {children}
      </div>
    </div>
  );
}
