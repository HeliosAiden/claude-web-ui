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
