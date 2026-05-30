import { create } from 'zustand';

interface ConversationSearchState {
  open: boolean;
}

export const useConversationSearchStore = create<ConversationSearchState>(() => ({
  open: false,
}));

/** Call from outside the chat view to open the conversation search/find widget. */
export function triggerConversationSearch() {
  useConversationSearchStore.setState({ open: true });
}
