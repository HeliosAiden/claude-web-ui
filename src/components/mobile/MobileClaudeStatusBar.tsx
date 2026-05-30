import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '../../lib/utils';
import { useMobileStatusStore } from '../../stores/useMobileStatusStore';
import SessionProviderLogo from '../llm-logo-provider/SessionProviderLogo';
import {
  CLAUDE_MODELS,
  CURSOR_MODELS,
  CODEX_MODELS,
  GEMINI_MODELS,
} from '../../../shared/modelConstants';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ACTION_KEYS = [
  'claudeStatus.actions.thinking',
  'claudeStatus.actions.processing',
  'claudeStatus.actions.analyzing',
  'claudeStatus.actions.working',
  'claudeStatus.actions.computing',
  'claudeStatus.actions.reasoning',
];

const DEFAULT_ACTION_WORDS = [
  'Thinking',
  'Processing',
  'Analyzing',
  'Working',
  'Computing',
  'Reasoning',
];

/**
 * Per-provider dot color — a single 8px dot identifies which provider
 * is generating. No glass overlays, no glow rings, no background tints.
 */
const DOT_COLORS: Record<string, string> = {
  claude: 'bg-amber-500',
  codex:  'bg-emerald-500',
  gemini: 'bg-sky-500',
  cursor: 'bg-indigo-500',
};

/** Resolve the human-readable model label from localStorage + central constants. */
function resolveModelLabel(provider: string): string {
  const modelKey = `${provider}-model`;
  const modelMaps: Record<string, { value: string; label: string }[]> = {
    'claude-model': CLAUDE_MODELS.OPTIONS,
    'cursor-model': CURSOR_MODELS.OPTIONS,
    'codex-model': CODEX_MODELS.OPTIONS,
    'gemini-model': GEMINI_MODELS.OPTIONS,
  };
  const defaults: Record<string, string> = {
    claude: CLAUDE_MODELS.DEFAULT,
    cursor: CURSOR_MODELS.DEFAULT,
    codex: CODEX_MODELS.DEFAULT,
    gemini: GEMINI_MODELS.DEFAULT,
  };
  const modelValue =
    (typeof window !== 'undefined'
      ? localStorage.getItem(modelKey)
      : null) ?? defaults[provider] ?? 'opus';
  const found = modelMaps[modelKey]?.find((m) => m.value === modelValue);
  return found?.label ?? modelValue;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatElapsedTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins < 1) return `${secs}s`;
  const m = mins < 10 ? `0${mins}` : `${mins}`;
  const s = secs < 10 ? `0${secs}` : `${secs}`;
  return `${m}:${s}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * MobileClaudeStatusBar — a compact floating pill below the mobile
 * header that appears while a provider is generating a response.
 *
 * Design philosophy
 * ─────────────────
 * System notification, not decoration. Follows the same language as
 * ChatGPT / Perplexity mobile status bars:
 *   – solid, opaque background (no glassmorphism)
 *   – one slim animated element (the provider dot)
 *   – agent identity (logo + model name) on the left
 *   – dynamic status (text + timer + stop) on the right
 *   – neutral stop action (not destructive‑red)
 *   – smooth 200 ms enter / exit fade+slide
 */
export default function MobileClaudeStatusBar() {
  const { t } = useTranslation('chat');

  /* ── store selectors (contract — must keep exact) ───────────── */
  const isLoading = useMobileStatusStore((s) => s.isLoading);
  const status    = useMobileStatusStore((s) => s.status);
  const provider  = useMobileStatusStore((s) => s.provider);
  const onAbort   = useMobileStatusStore((s) => s.onAbort);

  /* ── resolved model label ───────────────────────────────────── */
  const modelLabel = useMemo(() => resolveModelLabel(provider), [provider]);

  /* ── entry / exit animation ──────────────────────────────────── */
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setMounted(true);
      setEntered(false);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const timer = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timer);
  }, [isLoading]);

  /* ── elapsed-time ticker ─────────────────────────────────────── */
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading) { setElapsedTime(0); return; }
    const start = Date.now();
    const tmr = setInterval(
      () => setElapsedTime(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(tmr);
  }, [isLoading]);

  /* ── early exit ──────────────────────────────────────────────── */
  if (!mounted) return null;

  /* ── derived values ──────────────────────────────────────────── */
  const dotColor = DOT_COLORS[provider] || DOT_COLORS.claude;

  const actionWords = ACTION_KEYS.map(
    (key, i) => t(key, { defaultValue: DEFAULT_ACTION_WORDS[i] }),
  );
  const statusText = (
    status?.text ??
    actionWords[Math.floor(elapsedTime / 3) % actionWords.length]
  ).replace(/[.]+$/, '');

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        'pointer-events-none',
        'fixed inset-x-0 top-0 z-50 flex justify-center',
        /* sit below the mobile header bar (~48 px of header + safe area) */
        'px-4 pt-[calc(env(safe-area-inset-top,8px)+48px)]',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto',
          'flex items-center gap-3 h-11 rounded-full',
          'pl-2.5 pr-2.5',
          /* solid card */
          'bg-white dark:bg-gray-950',
          /* subtle edge */
          'ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
          /* soft float shadow */
          'shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
          'dark:shadow-[0_2px_12px_rgba(0,0,0,0.32)]',
          /* entry / exit */
          'transition-all duration-200 ease-out',
          entered
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-2 scale-[0.96]',
        )}
      >
        {/* ── agent logo ─────────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center justify-center',
            'h-6 w-6 rounded-full',
            'bg-gray-100 dark:bg-gray-800/60',
          )}
        >
          <SessionProviderLogo
            provider={provider}
            className="h-3.5 w-3.5"
          />
        </div>

        {/* ── model name ─────────────────────────────────────────── */}
        <span
          className={cn(
            'shrink-0',
            'text-[11px] font-medium leading-none tracking-tight',
            'text-gray-500 dark:text-gray-400',
          )}
        >
          {modelLabel}
        </span>

        {/* ── pulsing separator dot ────────────────────────────── */}
        <span
          className={cn(
            'h-[5px] w-[5px] shrink-0 rounded-full',
            'animate-dot-pulse',
            dotColor,
          )}
        />

        {/* ── status text ───────────────────────────────────────── */}
        <span
          className={cn(
            'truncate max-w-[40vw]',
            'text-[11px] font-medium leading-none',
            'text-gray-800 dark:text-gray-200',
          )}
        >
          {statusText}
        </span>

        {/* ── elapsed time ──────────────────────────────────────── */}
        <span
          className={cn(
            'shrink-0',
            'text-[11px] font-mono leading-none',
            'tabular-nums tracking-tighter',
            'text-gray-400 dark:text-gray-500',
          )}
        >
          {formatElapsedTime(elapsedTime)}
        </span>

        {/* ── stop button ───────────────────────────────────────── */}
        {onAbort && (
          <button
            type="button"
            onClick={onAbort}
            className={cn(
              'flex items-center justify-center',
              'h-7 w-7 shrink-0 rounded-full',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-400 dark:text-gray-500',
              'active:bg-gray-200 dark:active:bg-gray-700',
              'transition-colors duration-150 ease-out',
            )}
            aria-label={t(
              'claudeStatus.controls.stopGeneration',
              'Stop generation',
            )}
          >
            <span className="h-2.5 w-2.5 rounded-[1.5px] bg-current" />
          </button>
        )}
      </div>
    </div>
  );
}
