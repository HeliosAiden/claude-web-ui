import { MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FloatingChatHubProps {
  onClick: () => void;
  isActive: boolean;
  hidden: boolean;
}

export default function FloatingChatHub({ onClick, isActive, hidden }: FloatingChatHubProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'floating-chat-hub fixed left-1/2 -translate-x-1/2 z-40',
        'flex items-center justify-center w-11 h-11 rounded-full',
        'transition-all duration-200 active:scale-90',
        'shadow-lg shadow-primary/25',
        isActive
          ? 'bg-primary text-primary-foreground scale-110'
          : 'bg-muted text-muted-foreground',
        hidden && 'opacity-0 pointer-events-none',
      )}
      style={{ bottom: 'calc(var(--mobile-nav-total, 72px) + 8px)' }}
      aria-label="Open chat actions"
    >
      <MessageCircle className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
    </button>
  );
}
