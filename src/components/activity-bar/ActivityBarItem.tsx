import React from 'react';
import { cn } from '../../lib/utils';
import Tooltip from '../../shared/view/ui/Tooltip';
import type { ActivityBarItemProps } from './types';

function ActivityBarItem({
  item,
  isActive,
  onClick,
  isMobile,
  hasFlyoutIndicator,
  flyoutOpen,
}: ActivityBarItemProps) {
  const Icon = item.icon;

  const iconElement = item.customIcon ? (
    <span className={cn(isMobile ? 'w-5 h-5' : 'w-[22px] h-[22px]', 'flex items-center justify-center')}>
      {item.customIcon}
    </span>
  ) : (
    <Icon
      className={cn(
        isMobile ? 'w-5 h-5' : 'w-[22px] h-[22px]',
        isActive && !isMobile && 'scale-105',
      )}
      strokeWidth={isActive ? 2.25 : 2}
    />
  );

  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isMobile
          ? cn(
              'flex-col gap-0.5 px-1 py-1.5 rounded-lg min-w-0 flex-1',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )
          : cn(
              'w-12 h-11',
              isActive
                ? 'text-primary bg-accent/40 activity-item-active'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
            ),
      )}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Desktop active accent bar */}
      {!isMobile && isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-sm bg-primary" />
      )}

      {/* Mobile active top accent bar */}
      {isMobile && isActive && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-sm bg-primary" />
      )}

      {iconElement}

      {isMobile && (
        <span className="text-[10px] leading-none font-medium truncate max-w-full">
          {item.label}
        </span>
      )}

      {/* Badge (desktop) */}
      {!isMobile && item.badge !== undefined && (
        <span className="absolute top-1 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none">
          {item.badge}
        </span>
      )}

      {/* Flyout connector indicator for Projects icon */}
      {hasFlyoutIndicator && flyoutOpen && !isMobile && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-8 bg-primary/40 rounded-l-sm" />
      )}
    </button>
  );

  if (isMobile) {
    return button;
  }

  return (
    <Tooltip content={item.label} position="right" delay={400}>
      {button}
    </Tooltip>
  );
}

export default React.memo(ActivityBarItem);
