import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SendHorizontal,
  Plus,
  X,
  Paperclip,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';

import {
  CLAUDE_MODELS,
  CURSOR_MODELS,
  CODEX_MODELS,
  GEMINI_MODELS,
} from '../../../shared/modelConstants';

const ATTACHMENT_OPTIONS = [
  { icon: Paperclip, label: 'Add files', description: 'Attach documents and code' },
  { icon: ImageIcon, label: 'Add images', description: 'Attach screenshots and photos' },
  { icon: FileText, label: 'Use prompt templates', description: 'Insert a saved template' },
];

function getProviderDisplayName(p: string) {
  if (p === 'claude') return 'Claude';
  if (p === 'cursor') return 'Cursor';
  if (p === 'codex') return 'Codex';
  return 'Gemini';
}

function AttachmentsPanel({ onOpenPromptTemplates }: { onOpenPromptTemplates?: () => void }) {
  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-1 px-1 py-2 duration-200">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Attach to message
      </div>
      {ATTACHMENT_OPTIONS.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={opt.label === 'Use prompt templates' ? onOpenPromptTemplates : undefined}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-accent/50 active:bg-accent"
        >
          <opt.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-left">
            <div className="text-sm text-foreground">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

import type { ModelAvailabilityMap } from '../../types/app';

interface ChatComposerBarProps {
  onBlur: () => void;
  onSend: (text: string) => void;
  fccModels?: { value: string; label: string }[];
  modelAvailability?: ModelAvailabilityMap;
  initialContent?: string;
  onOpenPromptTemplates?: () => void;
}

export default function ChatComposerBar({ onBlur, onSend, fccModels: fccProp, modelAvailability, initialContent, onOpenPromptTemplates }: ChatComposerBarProps) {
  const [showAttachments, setShowAttachments] = useState(false);
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const modelInfo = useMemo(() => {
    const storedProvider = (typeof window !== 'undefined'
      ? localStorage.getItem('selected-provider')
      : null) ?? 'claude';
    const providerName = getProviderDisplayName(storedProvider);

    const modelKey = `${storedProvider}-model`;
    const modelMap: Record<string, { value: string; label: string }[]> = {
      'claude-model': CLAUDE_MODELS.OPTIONS,
      'cursor-model': CURSOR_MODELS.OPTIONS,
      'codex-model': CODEX_MODELS.OPTIONS,
      'gemini-model': GEMINI_MODELS.OPTIONS,
    };
    const storedModel = typeof window !== 'undefined'
      ? localStorage.getItem(modelKey)
      : null;
    const defaultModel: Record<string, string> = {
      claude: CLAUDE_MODELS.DEFAULT,
      cursor: CURSOR_MODELS.DEFAULT,
      codex: CODEX_MODELS.DEFAULT,
      gemini: GEMINI_MODELS.DEFAULT,
    };

    const modelValue = storedModel ?? defaultModel[storedProvider] ?? 'opus';

    // Try hardcoded options first, then FCC models (for deepseek, etc.)
    let found = modelMap[modelKey]?.find((m) => m.value === modelValue);
    if (!found && storedProvider === 'claude' && fccProp?.length) {
      found = fccProp.find(m => m.value === modelValue);
    }

    // Determine if the current model is available
    const isFccModel = storedProvider === 'claude' && fccProp?.some(fm => fm.value === modelValue);
    const isAvailable = isFccModel || modelAvailability?.[modelValue]?.available !== false;

    return { providerName, modelLabel: found?.label ?? modelValue, isAvailable };
  }, [fccProp, modelAvailability]);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Pre-fill textarea when initialContent is set (from template selection)
  useEffect(() => {
    if (initialContent) {
      setInputText(initialContent);
    }
  }, [initialContent]);

  // Blur dismiss: two-phase interaction
  // 1st tap outside (keyboard open) → blur textarea, keep bar
  // 2nd tap outside (keyboard closed) → dismiss bar
  useEffect(() => {
    let touchStartY = 0;

    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;

      if (document.activeElement === textareaRef.current) {
        textareaRef.current?.blur();
      } else {
        onBlur();
      }
    }

    function handleTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (containerRef.current.contains(target)) return;

      // Only dismiss on tap, not scroll/drag
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (dy > 10) return;

      if (document.activeElement === textareaRef.current) {
        textareaRef.current?.blur();
      } else {
        onBlur();
      }
    }

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('touchstart', handleTouchStart, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchend', handleTouchEnd, { capture: true } as EventListenerOptions);
    };
  }, [onBlur]);

  return (
    <div
      ref={containerRef}
      className="mobile-composer-bar fixed inset-x-0 z-20 border-t border-border/50 bg-card/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-lg"
    >
      <div className="px-3 pb-3 pt-2">
        {/* Attachment options panel (shown when + toggled) */}
        {showAttachments && <AttachmentsPanel onOpenPromptTemplates={onOpenPromptTemplates} />}

        {/* Composer bar */}
        <div className="flex items-end gap-2 rounded-xl border border-border/50 bg-accent/40 px-3 py-2">
          {/* + / x toggle button */}
          <button
            type="button"
            onClick={() => setShowAttachments((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent/80"
            aria-label={showAttachments ? 'Close attachments' : 'Add attachments'}
          >
            {showAttachments ? (
              <X className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Plus className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {/* Textarea input */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (inputText.trim()) {
                  onSend(inputText);
                  setInputText('');
                }
              }
            }}
            rows={1}
            placeholder={modelInfo.isAvailable ? `Ask ${modelInfo.providerName} anything...` : 'Current model unavailable — change in settings'}
            className="max-h-[80px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-tight text-foreground outline-none placeholder:text-muted-foreground/50"
          />

          {/* Telegram-style send button */}
          <button
            type="button"
            onClick={() => {
              if (inputText.trim()) {
                onSend(inputText);
                setInputText('');
              }
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-95"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
