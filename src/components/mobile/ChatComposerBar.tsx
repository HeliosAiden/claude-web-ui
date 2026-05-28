import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function AttachmentsPanel() {
  return (
    <div className="px-1 py-2 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
        Attach to message
      </div>
      {ATTACHMENT_OPTIONS.map((opt) => (
        <button
          key={opt.label}
          type="button"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent/50 active:bg-accent transition-colors duration-150 cursor-pointer"
        >
          <opt.icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="text-left">
            <div className="text-sm text-foreground">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

interface ChatComposerBarProps {
  onBlur: () => void;
  onSend: (text: string) => void;
}

export default function ChatComposerBar({ onBlur, onSend }: ChatComposerBarProps) {
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
    const found = modelMap[modelKey]?.find((m) => m.value === modelValue);

    return { providerName, modelLabel: found?.label ?? modelValue };
  }, []);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
      className="mobile-composer-bar fixed inset-x-0 z-20 bg-card/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="px-3 pt-2 pb-3">
        {/* Attachment options panel (shown when + toggled) */}
        {showAttachments && <AttachmentsPanel />}

        {/* Composer bar */}
        <div className="flex items-end gap-2 px-3 py-2 rounded-xl bg-accent/40 border border-border/50">
          {/* + / x toggle button */}
          <button
            type="button"
            onClick={() => setShowAttachments((v) => !v)}
            className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 hover:bg-accent active:bg-accent/80 transition-colors"
            aria-label={showAttachments ? 'Close attachments' : 'Add attachments'}
          >
            {showAttachments ? (
              <X className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Plus className="w-5 h-5 text-muted-foreground" />
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
            placeholder={`Ask ${modelInfo.providerName} anything...`}
            className="flex-1 min-h-[36px] max-h-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none py-1.5 leading-tight"
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
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground shrink-0 hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-sm"
            aria-label="Send message"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
