import { useCallback, useEffect, useRef } from 'react';
import { Bookmark, X } from 'lucide-react';

interface BookmarkItem {
  messageUuid: string;
  contentSnippet: string;
  role: string;
  messageTimestamp: string;
}

interface ChatBookmarksOverlayProps {
  bookmarks: BookmarkItem[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  allMessagesLoaded: boolean;
  loadAllMessages: () => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatBookmarksOverlay({
  bookmarks,
  scrollContainerRef,
  allMessagesLoaded,
  loadAllMessages,
  onClose,
}: ChatBookmarksOverlayProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Focus the list on mount so Escape works immediately
  useEffect(() => {
    listRef.current?.focus();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

  const scrollToBookmark = useCallback(async (uuid: string) => {
    // Close overlay first so the scroll container is unobstructed
    onClose();

    const container = scrollContainerRef.current;
    if (!container) return;

    // Try to find the message element in the DOM
    const el = container.querySelector(`[data-message-uuid="${uuid}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('search-highlight-flash');
      setTimeout(() => el.classList.remove('search-highlight-flash'), 3000);
      return;
    }

    // Message not loaded yet — load all messages, then scroll after render
    if (!allMessagesLoaded) {
      await loadAllMessages();
      // Wait for React to flush the DOM
      await new Promise((resolve) => setTimeout(resolve, 400));
      const el2 = container.querySelector(`[data-message-uuid="${uuid}"]`);
      if (el2) {
        el2.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el2.classList.add('search-highlight-flash');
        setTimeout(() => el2.classList.remove('search-highlight-flash'), 3000);
      }
    }
  }, [scrollContainerRef, allMessagesLoaded, loadAllMessages, onClose]);

  return (
    <div
      className="flex max-h-[40vh] flex-col rounded-lg border border-border/60 bg-popover/95 shadow-lg backdrop-blur-sm"
      ref={listRef}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Bookmark className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Bookmarks
          {bookmarks.length > 0 && (
            <span className="ml-1 text-muted-foreground">({bookmarks.length})</span>
          )}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent/50"
          aria-label="Close bookmarks"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List or empty state */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-muted-foreground">
          <Bookmark className="h-8 w-8 opacity-30" />
          <p className="text-sm">No bookmarks yet</p>
        </div>
      ) : (
        <div className="flex-1 space-y-px overflow-y-auto border-t border-border/50 px-1 pb-1">
          {bookmarks.map((bk) => (
            <button
              key={bk.messageUuid}
              type="button"
              onClick={() => { void scrollToBookmark(bk.messageUuid); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent/50"
            >
              <span
                className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  bk.role === 'user'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {bk.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground/80">
                {bk.contentSnippet.slice(0, 60)}
              </span>
              <span className="flex-shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {formatTime(bk.messageTimestamp)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
