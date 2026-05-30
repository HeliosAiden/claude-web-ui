# Mobile Bookmarks Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the mobile "Other Actions" → "Bookmarks" stub so it shows a sticky overlay listing all bookmarks from the current session, and tapping a row scrolls to that message.

**Architecture:** A Zustand store (`useBookmarksOverlayStore`) mirrors the existing `useConversationSearchStore`. A new `ChatBookmarksOverlay` component renders as a sticky popover inside `ChatMessagesPane`, fed by `pinnedBookmarks` from the chat session context — no new API calls needed.

**Tech Stack:** React, Zustand, Tailwind CSS, existing `pinnedBookmarks` + `scrollToPinned`-style scroll logic.

**Files to create:** 2
**Files to modify:** 2

---

### Task 1: Create Zustand store

**Files:**
- Create: `src/stores/useBookmarksOverlayStore.ts`

- [ ] **Step 1: Write the store file**

```ts
import { create } from 'zustand';

interface BookmarksOverlayState {
  open: boolean;
}

export const useBookmarksOverlayStore = create<BookmarksOverlayState>(() => ({
  open: false,
}));

/** Call from outside the chat view to open the bookmarks overlay. */
export function triggerBookmarksOverlay() {
  useBookmarksOverlayStore.setState({ open: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/useBookmarksOverlayStore.ts
git commit -m "feat: add useBookmarksOverlayStore for mobile bookmarks overlay"
```

---

### Task 2: Create ChatBookmarksOverlay component

**Files:**
- Create: `src/components/chat/view/subcomponents/ChatBookmarksOverlay.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  allMessagesLoaded: boolean;
  loadAllMessages: () => Promise<void>;
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

  // Focus the list container on mount so Escape works immediately
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

    // Try to find the message element already rendered in the DOM
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/view/subcomponents/ChatBookmarksOverlay.tsx
git commit -m "feat: add ChatBookmarksOverlay component for mobile bookmarks list"
```

---

### Task 3: Wire up ChatMessagesPane

**Files:**
- Modify: `src/components/chat/view/subcomponents/ChatMessagesPane.tsx`

- [ ] **Step 1: Add the import at the top** (after the existing `ChatFindWidget` import on line 13):

```tsx
import ChatBookmarksOverlay from './ChatBookmarksOverlay';
import { useBookmarksOverlayStore } from '../../../../stores/useBookmarksOverlayStore';
```

- [ ] **Step 2: Add the store subscription** inside the component, after the existing `csOpen` line (~line 181):

```tsx
const bookmarksOverlayOpen = useBookmarksOverlayStore((s) => s.open);
```

- [ ] **Step 3: Add the overlay rendering** inside the JSX, immediately after the find widget block (after the `{findOpen && (...)}` closing `}` on ~line 480):

```tsx
          {/* Bookmarks overlay */}
          {bookmarksOverlayOpen && (
            <div className="sticky top-2 z-30">
              <ChatBookmarksOverlay
                bookmarks={pinnedBookmarks}
                scrollContainerRef={scrollContainerRef}
                allMessagesLoaded={allMessagesLoaded}
                loadAllMessages={loadAllMessages}
                onClose={() => useBookmarksOverlayStore.setState({ open: false })}
              />
            </div>
          )}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/view/subcomponents/ChatMessagesPane.tsx
git commit -m "feat: render ChatBookmarksOverlay in ChatMessagesPane"
```

---

### Task 4: Wire up bottom sheet ActionRow

**Files:**
- Modify: `src/components/mobile/BottomSheetContent.tsx`

- [ ] **Step 1: Add the import** (after the existing `triggerConversationSearch` import on line 24):

```tsx
import { triggerBookmarksOverlay } from '../../stores/useBookmarksOverlayStore';
```

- [ ] **Step 2: Add onClick to the Bookmarks ActionRow** (line 373). Replace the stub:

```tsx
<ActionRow icon={Bookmark} label="Bookmarks" description="View saved bookmarks" />
```

With:

```tsx
<ActionRow icon={Bookmark} label="Bookmarks" description="View saved bookmarks" onClick={() => { onClose?.(); triggerBookmarksOverlay(); }} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mobile/BottomSheetContent.tsx
git commit -m "feat: wire up Bookmarks action in mobile bottom sheet"
```

---

## Verification

1. Run `npm run typecheck` — verify no TypeScript errors
2. Run `npm run lint` — verify no lint errors
3. Start the app with `npm run dev`
4. On mobile viewport, open a session with bookmarked messages
5. Tap the Chat tab → bottom sheet → "Other Actions" → "Bookmarks"
6. Verify overlay opens at the top of the chat messages area listing bookmarks from the current session
7. Tap a bookmark row → verify it smooth-scrolls to the message with a yellow highlight flash, then overlay closes
8. Test with a session that has 0 bookmarks → "No bookmarks yet" empty state
9. Tap X → overlay closes
10. Test with a long conversation where the bookmarked message isn't loaded → overlay loads all messages before scrolling
