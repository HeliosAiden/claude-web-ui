# Mobile ClaudeStatus Design

## Context

The desktop ClaudeStatus component shows the user that Claude (or another provider) is actively generating a response — it displays the provider logo, an animated status label with dots ("Thinking..."), an elapsed time counter, and a STOP button to abort the current response. On mobile, this component is completely absent because the mobile layout (`MobileAppShell`) uses a separate, simpler `ChatComposerBar` that has no status awareness.

This spec defines a mobile-native version that reuses the existing WebSocket status pipeline without modifying the desktop behavior.

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/stores/useMobileStatusStore.ts` | Tiny Zustand bridge store — holds `isLoading`, `status`, `provider`, and `onAbort` callback |
| `src/components/mobile/MobileClaudeStatusBar.tsx` | The pill/banner component — subscribes to the store |

### Modified Files

| File | Change |
|---|---|
| `src/components/chat/view/ChatInterface.tsx` | Add a `useEffect` to sync existing status state into the mobile store when `isMobile=true` |
| `src/components/mobile/MobileAppShell.tsx` | Import and render `<MobileClaudeStatusBar />` inside the workspace div, above `SwipeAnimatedPageView` |

### Data Flow

```
WebSocket → useChatRealtimeHandlers → useChatSessionState (claudeStatus, isLoading, canAbortSession)
                                          ↓
                                  ChatInterface.tsx
                                    │
                                    │ useEffect (if isMobile)
                                    ▼
                          useMobileStatusStore (Zustand)
                           subscribe (selector pattern)
                                    │
                                    ▼
                          MobileClaudeStatusBar
                            (rendered in MobileAppShell)
```

The store is purely additive. No existing hooks or state managers are touched; desktop behavior is completely unaffected.

## Component Behavior

- **Visible only when** `isLoading === true`. Same trigger as desktop: `session-status`, `status` WebSocket messages set `isLoading=true`; `complete`, `error` messages set it back to `false`. The STOP button also sets it to `false`.
- **Position:** Fixed at top of viewport (`position: fixed, top: env(safe-area-inset-top)`), centered, rendered above all mobile content so it's visible across all tabs while a response is generating.
- **Visual:** Compact pill/chip, provider-brand-colored accent. No provider logo or label — simplified.
- **Content:** Animated dots + rotating status text ("Thinking...", "Processing...") + elapsed time (`12s`) + STOP button (red square, minimum 44px touch target).

## Zustand Bridge Store

```typescript
interface MobileClaudeStatusData {
  text?: string;
  tokens?: number;
  can_interrupt?: boolean;
}

interface MobileStatusStore {
  isLoading: boolean;
  status: MobileClaudeStatusData | null;
  provider: string;
  onAbort: (() => void) | null;

  sync: (data: {
    isLoading: boolean;
    status: MobileClaudeStatusData | null;
    provider: string;
    onAbort: (() => void) | null;
  }) => void;
}
```

`MobileClaudeStatusBar` uses `useSyncExternalStore` (React 18) to subscribe via Zustand's `subscribe` with a selector, avoiding re-render overhead in the component tree.

## Sync Point in ChatInterface.tsx

A single `useEffect` (~5 lines):
```typescript
useEffect(() => {
  if (!isMobile) return;
  useMobileStatusStore.getState().sync({
    isLoading,
    status: claudeStatus,
    provider,
    onAbort: isLoading && canAbortSession ? handleAbortSession : null,
  });
}, [isMobile, isLoading, claudeStatus, provider, canAbortSession, handleAbortSession]);
```
`onAbort` is `null` when not loading, preventing stale closure capture. Dependencies mirror exactly the state that feeds the desktop `ClaudeStatus`.

## MobileClaudeStatusBar Visual Design

```
   ┌───────────────────────────────────────┐
   │  ● ● ●  Thinking...        12s   ■ STOP│
   └───────────────────────────────────────┘
     ↑ animated dots & status   ↑ elapsed  ↑ STOP button
       text rotation              timer      (44px min tap)
```

- **Color scheme:** Provider-brand accent. Subtle tinted background using the provider's brand hue (Claude=amber, codex=green, gemini=blue, cursor=purple).
- **Animation:** `animate-in fade-in slide-in-from-top` on appear; `animate-out` on disappear.
- **Dots animation:** CSS `steps()` animation for smoother dot cycling without re-render state.
- **Status text rotation:** Matches desktop — cycles through 6 action words every 3 seconds.
- **Elapsed time:** `formatElapsedTime` — same helper as desktop.
- **STOP button:** Red square icon, min 44×44px touch target. No ESC badge (mobile has no keyboard). Calls `onAbort` from the store.
- **Safe areas:** Uses `env(safe-area-inset-top)` to clear the notch/dynamic island.
- **Width:** Auto-width with horizontal margin, or `w-[85vw] max-w-sm` — does not span edge-to-edge on tablets.

## Edge Cases

| Scenario | Behavior |
|---|---|
| Tab switch mid-generation | Banner is fixed above tab content, stays visible |
| Quick response (< 1s) | Banner appears then disappears. No minimum duration guard (matching desktop) |
| Provider change | Store syncs `provider` on every effect run — brand accent updates |
| Network disconnect | `onWebSocketReconnect` sets `isLoading=false` → banner disappears |
| Landscape mode | Pill auto-sizes, max-width prevents horizontal overflow |
| Safe areas | `env(safe-area-inset-top)` for notch/dynamic island on iOS |
| No keyboard | STOP button shown without ESC badge |
| Error during generation | `error` WebSocket message → `isLoading=false` → banner disappears |

## Verification

1. Start the app with `npm run dev`
2. On a browser with mobile viewport (Chrome DevTools device mode), verify:
   - Submit a message → banner appears at top with animated dots
   - Dots cycle, status text rotates, elapsed timer counts up
   - Provider brand color is correct for each provider (switch in bottom sheet)
   - Tap STOP → generation stops, banner disappears
   - Switch between mobile tabs during generation → banner stays visible
   - Response completes naturally → banner disappears
3. On desktop viewport → verify no banner appears (desktop `ClaudeStatus` works as before, unaffected)
