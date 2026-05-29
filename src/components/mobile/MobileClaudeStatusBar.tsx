import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { useMobileStatusStore } from '../../stores/useMobileStatusStore';

const ACTION_KEYS = [
  'claudeStatus.actions.thinking',
  'claudeStatus.actions.processing',
  'claudeStatus.actions.analyzing',
  'claudeStatus.actions.working',
  'claudeStatus.actions.computing',
  'claudeStatus.actions.reasoning',
];
const DEFAULT_ACTION_WORDS = ['Thinking', 'Processing', 'Analyzing', 'Working', 'Computing', 'Reasoning'];

// Provider → Tailwind accent classes for the brand-forward tint
const ACCENT_MAP: Record<string, { bg: string; border: string; dot: string }> = {
  claude:  { bg: 'bg-amber-50/60', border: 'border-amber-200/40', dot: 'bg-amber-500' },
  codex:   { bg: 'bg-emerald-50/60', border: 'border-emerald-200/40', dot: 'bg-emerald-500' },
  gemini:  { bg: 'bg-sky-50/60', border: 'border-sky-200/40', dot: 'bg-sky-500' },
  cursor:  { bg: 'bg-violet-50/60', border: 'border-violet-200/40', dot: 'bg-violet-500' },
};

function formatElapsedTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return mins < 1 ? `${secs}s` : `${mins}m ${secs}s`;
}

export default function MobileClaudeStatusBar() {
  const { t } = useTranslation('chat');

  // Subscribe to store with selector — minimal re-renders
  const storeState = useSyncExternalStore(
    useMobileStatusStore.subscribe,
    () => ({
      isLoading: useMobileStatusStore.getState().isLoading,
      status: useMobileStatusStore.getState().status,
      provider: useMobileStatusStore.getState().provider,
      onAbort: useMobileStatusStore.getState().onAbort,
    }),
  );

  const { isLoading, status, provider, onAbort } = storeState;

  // Local animation state (independent of store — no sync needed)
  const [elapsedTime, setElapsedTime] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(dotTimer);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  const accent = ACCENT_MAP[provider] || ACCENT_MAP.claude;
  const actionWords = ACTION_KEYS.map((key, i) =>
    t(key, { defaultValue: DEFAULT_ACTION_WORDS[i] }),
  );
  const statusText = (
    status?.text ||
    actionWords[Math.floor(elapsedTime / 3) % actionWords.length]
  ).replace(/[.]+$/, '');

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[env(safe-area-inset-top,8px)]">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-full border shadow-sm backdrop-blur-md transition-colors duration-300',
          accent.bg,
          accent.border,
        )}
      >
        {/* Animated dots */}
        <div className="flex items-center gap-1">
          <span className="flex h-2 w-2">
            <span className={cn('absolute inline-flex h-2 w-2 rounded-full animate-ping opacity-75', accent.dot)} />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', accent.dot)} />
          </span>
        </div>

        {/* Status text */}
        <p className="whitespace-nowrap text-xs font-medium text-foreground">
          {statusText}
          <span className="inline-block w-4 text-primary">{dots}</span>
        </p>

        {/* Elapsed time */}
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {formatElapsedTime(elapsedTime)}
        </span>

        {/* STOP button */}
        {onAbort && (
          <button
            type="button"
            onClick={onAbort}
            className="flex h-[44px] min-w-[44px] items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all duration-150 hover:bg-destructive hover:text-destructive-foreground active:scale-95"
            aria-label={t('claudeStatus.controls.stopGeneration', 'Stop generation')}
          >
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
