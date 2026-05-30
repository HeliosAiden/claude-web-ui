# Mobile Bookmarks Overlay — Design Spec

## Context

The mobile "Other Actions" → "Bookmarks" item in the bottom sheet is currently a stub. All bookmarks infrastructure already exists:

- **Server API**: toggle, list, check, delete endpoints
- **In-chat toggle button**: `MessageBookmarkButton` on each message
- **Pinned bookmarks bar**: Telegram-style sticky bar at the top of `ChatMessagesPane` cycling through bookmarks
- **Desktop sidebar panel**: full bookmarks list with search

The goal is to wire up the mobile Bookmarks action so users can see all bookmarks from the current session and tap one to scroll to it.

## Design

### Pattern: Overlay (same as Search)

The Bookmarks overlay follows the exact same architecture as the conversation search ("Find in conversation") already implemented for mobile:

1. A Zustand store with a boolean `open` flag and a `triggerBookmarksOverlay()` function
2. A new `ChatBookmarksOverlay` component rendered inside `ChatMessagesPane`, same visual layer as `ChatFindWidget`
3. The bottom sheet's `ActionRow` call `onClose?.(); triggerBookmarksOverlay();`

### Zustand Store

**File**: `src/stores/useBookmarksOverlayStore.ts`

```ts
interface BookmarksOverlayState { open: boolean }
export const useBookmarksOverlayStore = create<BookmarksOverlayState>(() => ({ open: false }));
export function triggerBookmarksOverlay() {
  useBookmarksOverlayStore.setState({ open: true });
}
```

Mirrors `useConversationSearchStore` exactly.

### ChatBookmarksOverlay Component

**File**: `src/components/chat/view/subcomponents/ChatBookmarksOverlay.tsx`

Rendered as a sticky overlay at the top of the scroll container (same position as `ChatFindWidget`, same `z-30` + `bg-popover/95 backdrop-blur-sm shadow-lg` styling).

**Layout**:

```
┌──────────────────────────────────────────┐
│ 🔖 Bookmarks (3)                 [X]     │
├──────────────────────────────────────────┤
│ [You]      Capital of France?      2:30  │
│ [Assist]   The capital of France   2:31  │
│ [You]      Explain how to set up   2:35  │
└──────────────────────────────────────────┘
```

- **Header row**: Bookmark icon + "Bookmarks" + count in parentheses + close button (X). Same font sizes as `ChatFindWidget` header.
- **List**: scrollable list of bookmarks from the current session. Reuses `pinnedBookmarks` from `ChatSessionContext`.
- **Each row**: role badge ("You" in blue / "Assistant" in gray), content snippet (~40-60 chars truncated), relative time. Tapping the row scrolls to that message (reuses `scrollToPinned`-style logic), then closes the overlay.
- **Empty state**: When there are 0 bookmarks, show a centered placeholder with the Bookmark icon + "No bookmarks yet" text.
- **Keyboard**: Escape closes.

**Scrolling behavior** (reuses existing patterns from `ChatMessagesPane`):

```ts
const scrollToBookmark = async (uuid: string) => {
  onClose();
  const container = scrollContainerRef.current;
  if (!container) return;
  const el = container.querySelector(`[data-message-uuid="${uuid}"]`);
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('search-highlight-flash');
    setTimeout(() => el.classList.remove('search-highlight-flash'), 3000);
    return;
  }
  if (!allMessagesLoaded) {
    await loadAllMessages();
    await new Promise(resolve => setTimeout(resolve, 400));
    const el2 = container.querySelector(`[data-message-uuid="${uuid}"]`);
    if (el2) {
      el2.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el2.classList.add('search-highlight-flash');
      setTimeout(() => el2.classList.remove('search-highlight-flash'), 3000);
    }
  }
};
```

The `search-highlight-flash` CSS class is already defined in the stylesheet.

### Integration Points

**1. `ChatMessagesPane.tsx`** — Add store subscription + component rendering alongside `ChatFindWidget`:

```tsx
import { useBookmarksOverlayStore } from '../../../../stores/useBookmarksOverlayStore';
import ChatBookmarksOverlay from './ChatBookmarksOverlay';

// Inside the component:
const bookmarksOverlayOpen = useBookmarksOverlayStore((s) => s.open);

// In the JSX, after the find widget block:
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

**2. `BottomSheetContent.tsx`** — Wire up the stub:

```tsx
import { triggerBookmarksOverlay } from '../../stores/useBookmarksOverlayStore';

// Line 373, replace:
<ActionRow icon={Bookmark} label="Bookmarks" description="View saved bookmarks" />
// With:
<ActionRow
  icon={Bookmark}
  label="Bookmarks"
  description="View saved bookmarks"
  onClick={() => { onClose?.(); triggerBookmarksOverlay(); }}
/>
```

### No new API calls

The overlay reads from `pinnedBookmarks` which is already populated by `useChatSessionState` via `GET /api/projects/bookmarks?sessionId=...&limit=100`.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/stores/useBookmarksOverlayStore.ts` | **Create** — Zustand store |
| `src/components/chat/view/subcomponents/ChatBookmarksOverlay.tsx` | **Create** — Overlay component |
| `src/components/chat/view/subcomponents/ChatMessagesPane.tsx` | **Modify** — Import store + render overlay |
| `src/components/mobile/BottomSheetContent.tsx` | **Modify** — Wire up onClick |

## Verification

1. Open a mobile session with bookmarked messages
2. Tap Chat tab → bottom sheet → "Other Actions" → "Bookmarks"
3. Verify the overlay opens at the top of the chat messages area
4. Verify it lists only bookmarks from the current session
5. Tap a bookmark row → verify it scrolls to the message with a yellow highlight flash, then overlay closes
6. Test with 0 bookmarks → verify "No bookmarks yet" empty state
7. Tap X → overlay closes
8. Test with a long conversation where the bookmarked message isn't loaded yet → verify overlay correctly triggers "load all messages" before scrolling
