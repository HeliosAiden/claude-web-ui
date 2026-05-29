import { useEffect, useState } from 'react';
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

// Provider → refined accent palette: a tinted blur hue + a vibrant accent for the pulse
const ACCENT_MAP: Record<string, { pill: string; pulse: string; glow: string }> = {
  claude:  { pill: 'bg-amber-500/8', pulse: 'bg-amber-500', glow: 'shadow-amber-500/20' },
  codex:   { pill: 'bg-emerald-500/8', pulse: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
  gemini:  { pill: 'bg-sky-500/8', pulse: 'bg-sky-500', glow: 'shadow-sky-500/20' },
  cursor:  { pill: 'bg-indigo-500/8', pulse: 'bg-indigo-500', glow: 'shadow-indigo-500/20' },
};

function formatElapsedTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins < 1) return `${secs}s`;
  const m = mins < 10 ? `0${mins}` : `${mins}`;
  const s = secs < 10 ? `0${secs}` : `${secs}`;
  return `${m}:${s}`;
}

/**
 * MobileClaudeStatusBar — a floating pill at the top of the viewport that appears
 * while a provider is generating a response.
 *
 * Visual treatment: iOS‑style frosted glass with a vibrant accent pulse,
 * breathing dot, and a filled stop button.
 */
export default function MobileClaudeStatusBar() {
  const { t } = useTranslation('chat');

  const isLoading = useMobileStatusStore((s) => s.isLoading);
  const status = useMobileStatusStore((s) => s.status);
  const provider = useMobileStatusStore((s) => s.provider);
  const onAbort = useMobileStatusStore((s) => s.onAbort);

  // ── local animation timers ──────────────────────────────────────────────
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading) { setElapsedTime(0); return; }
    const start = Date.now();
    const tmr = setInterval(() => setElapsedTime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tmr);
  }, [isLoading]);

  if (!isLoading) return null;

  const a = ACCENT_MAP[provider] || ACCENT_MAP.claude;

  const actionWords = ACTION_KEYS.map((key, i) => t(key, { defaultValue: DEFAULT_ACTION_WORDS[i] }));
  const statusText = (
    status?.text ??
    actionWords[Math.floor(elapsedTime / 3) % actionWords.length]
  ).replace(/[.]+$/, '');

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center',
        'px-4 pt-[calc(env(safe-area-inset-top,8px)+6px)]',
        // entry animation
        'animate-in fade-in slide-in-from-top-3 duration-[400ms] ease-out',
      )}
    >
      {/* ── frosted glass pill ─────────────────────────────────────────── */}
      <div
        className={cn(
          'pointer-events-auto relative isolate overflow-hidden',
          'flex items-center gap-2.5 pl-1.5 pr-1 py-1',
          'rounded-2xl',
          // frosted glass base — dark tint in light mode, light tint in dark
          'bg-white/75 dark:bg-gray-950/80',
          'shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]',
          'backdrop-blur-2xl saturate-[1.8]',
          // subtle inner border
          'ring-1 ring-inset ring-white/40 dark:ring-white/10',
          a.glow,
        )}
      >
        {/* ── soft accent tint layer ─────────────────────────────────── */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 -z-10',
            'opacity-[0.06] dark:opacity-[0.10]',
            a.pill,
          )}
        />

        {/* ── breathing dot ────────────────────────────────────────────── */}
        <span className="relative flex h-[18px] w-[18px] items-center justify-center">
          {/* glow ring */}
          <span
            className={cn(
              'absolute inset-0 rounded-full',
              'animate-[status-breath_2s_ease-in-out_infinite]',
              a.pulse,
              'opacity-30',
            )}
          />
          {/* solid core */}
          <span
            className={cn(
              'relative h-[10px] w-[10px] rounded-full',
              a.pulse,
              'shadow-[0_0_8px] shadow-current',
            )}
          />
        </span>

        {/* ── status text + animated ellipsis ─────────────────────────── */}
        <p className="flex items-baseline gap-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <span>{statusText}</span>
          <span className="inline-flex w-[1.2em] overflow-hidden">
            <span className="animate-[status-ellipsis_1.4s_steps(4,infinite)]">
              &nbsp;.&nbsp;&nbsp;.&nbsp;&nbsp;.&nbsp;
            </span>
          </span>
        </p>

        {/* ── elapsed time ─────────────────────────────────────────────── */}
        <span className="min-w-[3.2em] text-center font-mono text-[11px] font-medium tabular-nums tracking-tight text-gray-400 dark:text-gray-500">
          {formatElapsedTime(elapsedTime)}
        </span>

        {/* ── separator ────────────────────────────────────────────────── */}
        <span className="h-5 w-px bg-gray-200/70 dark:bg-gray-700/50" />

        {/* ── STOP button ──────────────────────────────────────────────── */}
        {onAbort && (
          <button
            type="button"
            onClick={onAbort}
            className={cn(
              'flex items-center justify-center',
              'h-8 w-8 rounded-full',
              'bg-red-600 text-white',
              'shadow-[0_2px_8px_rgba(220,38,38,0.35)]',
              'transition-[transform,box-shadow] duration-150',
              'active:scale-90 active:shadow-[0_1px_4px_rgba(220,38,38,0.25)]',
              'hover:bg-red-500',
            )}
            aria-label={t('claudeStatus.controls.stopGeneration', 'Stop generation')}
          >
            {/* square stop icon */}
            <span className="h-3.5 w-3.5 rounded-[2px] bg-current" />
          </button>
        )}
      </div>
    </div>
  );
}
