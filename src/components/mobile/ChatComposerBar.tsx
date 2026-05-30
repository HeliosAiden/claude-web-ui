import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SendHorizontal,
  Plus,
  X,
  Paperclip,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';

import {
  CLAUDE_MODELS,
  CURSOR_MODELS,
  CODEX_MODELS,
  GEMINI_MODELS,
} from '../../../shared/modelConstants';
import {
  supportsImageInput,
  supportsFileInput,
} from '../../../shared/modelCapabilities';

const ATTACHMENT_OPTIONS = [
  { icon: Paperclip, label: 'Add files', description: 'Attach documents and code' },
  { icon: ImageIcon, label: 'Add images', description: 'Attach screenshots and photos' },
  { icon: FileText, label: 'Use prompt templates', description: 'Insert a saved template' },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 5;
const MAX_FILES = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getProviderDisplayName(p: string) {
  if (p === 'claude') return 'Claude';
  if (p === 'cursor') return 'Cursor';
  if (p === 'codex') return 'Codex';
  return 'Gemini';
}

interface AttachmentChipProps {
  file: File;
  previewUrl?: string;
  onRemove: () => void;
}

function AttachmentChip({ file, previewUrl, onRemove }: AttachmentChipProps) {
  const isImage = file.type.startsWith('image/');
  return (
    <div className="group relative flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-accent/30 px-2 py-1.5">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-9 w-9 shrink-0 rounded object-cover"
        />
      ) : (
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 max-w-[120px]">
        <div className="truncate text-xs font-medium text-foreground">{file.name}</div>
        <div className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AttachmentsPanel({
  onOpenPromptTemplates,
  canAttachImages,
  canAttachFiles,
  onImagePickerClick,
  onFilePickerClick,
}: {
  onOpenPromptTemplates?: () => void;
  canAttachImages: boolean;
  canAttachFiles: boolean;
  onImagePickerClick: () => void;
  onFilePickerClick: () => void;
}) {
  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-1 px-1 py-2 duration-200">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Attach to message
      </div>
      {ATTACHMENT_OPTIONS.map((opt) => {
        const isImageAction = opt.label === 'Add images';
        const isFileAction = opt.label === 'Add files';
        const isDisabled = (isImageAction && !canAttachImages) || (isFileAction && !canAttachFiles);

        let tooltip = '';
        if (isImageAction && !canAttachImages) tooltip = 'This model does not support image attachments';
        if (isFileAction && !canAttachFiles) tooltip = 'This model does not support file attachments';

        return (
          <button
            key={opt.label}
            type="button"
            onClick={
              isImageAction
                ? onImagePickerClick
                : isFileAction
                  ? onFilePickerClick
                  : opt.label === 'Use prompt templates'
                    ? onOpenPromptTemplates
                    : undefined
            }
            disabled={isDisabled}
            title={tooltip || undefined}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150
              ${isDisabled
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-accent/50 active:bg-accent'
              }`}
          >
            <opt.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-left">
              <div className="text-sm text-foreground">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

import type { ModelAvailabilityMap } from '../../types/app';

interface AttachmentData {
  images: File[];
  files: File[];
}

interface ChatComposerBarProps {
  onBlur: () => void;
  onSend: (text: string, attachments: AttachmentData) => void;
  fccModels?: { value: string; label: string }[];
  modelAvailability?: ModelAvailabilityMap;
  initialContent?: string;
  onOpenPromptTemplates?: () => void;
}

export default function ChatComposerBar({ onBlur, onSend, fccModels: fccProp, modelAvailability, initialContent, onOpenPromptTemplates }: ChatComposerBarProps) {
  const [showAttachments, setShowAttachments] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelInfo = useMemo(() => {
    const storedProvider = (typeof window !== 'undefined'
      ? localStorage.getItem('selected-provider')
      : null) ?? 'claude';
    const providerName = getProviderDisplayName(storedProvider);

    const modelKey = `${storedProvider}-model`;
    const modelMap: Record<string, { value: string; label: string; capabilities?: { imageInput?: boolean; fileInput?: boolean } }[]> = {
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

    const modelOptions = modelMap[modelKey] ?? [];

    return {
      provider: storedProvider,
      providerName,
      modelLabel: found?.label ?? modelValue,
      modelValue,
      modelOptions,
      isAvailable,
    };
  }, [fccProp, modelAvailability]);

  // Derive capability booleans from model info
  const canAttachImages = supportsImageInput(modelInfo.provider, modelInfo.modelValue, modelInfo.modelOptions);
  const canAttachFiles = supportsFileInput(modelInfo.provider, modelInfo.modelValue, modelInfo.modelOptions);

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

  const previewUrlsRef = useRef<string[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    previewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  // Clean up preview ObjectURLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ── File picker change handlers ──────────────────────────────────────

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting same file
    if (files.length === 0) return;

    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name} exceeds 5 MB limit`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length > 0) setAttachmentErrors(errors);

    const remaining = MAX_IMAGES - attachedImages.length;
    const toAdd = valid.slice(0, remaining);
    if (valid.length > remaining) {
      errors.push(`Maximum ${MAX_IMAGES} images allowed`);
      setAttachmentErrors([...errors]);
    }

    if (toAdd.length === 0) return;

    const urls = toAdd.map((f) => URL.createObjectURL(f));
    setImagePreviewUrls((prev) => [...prev, ...urls]);
    setAttachedImages((prev) => [...prev, ...toAdd]);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds 10 MB limit`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length > 0) setAttachmentErrors(errors);

    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = valid.slice(0, remaining);
    if (valid.length > remaining) {
      errors.push(`Maximum ${MAX_FILES} files allowed`);
      setAttachmentErrors([...errors]);
    }

    if (toAdd.length === 0) return;

    setAttachedFiles((prev) => [...prev, ...toAdd]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAttachments = useCallback(() => {
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviewUrls([]);
    setAttachedImages([]);
    setAttachedFiles([]);
    setAttachmentErrors([]);
  }, [imagePreviewUrls]);

  const hasAttachments = attachedImages.length > 0 || attachedFiles.length > 0;

  const handleSend = () => {
    if (inputText.trim() || hasAttachments) {
      onSend(inputText, { images: attachedImages, files: attachedFiles });
      setInputText('');
      clearAttachments();
    }
  };

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
        clearAttachments();
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
        clearAttachments();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBlur]);

  return (
    <div
      ref={containerRef}
      className="mobile-composer-bar fixed inset-x-0 z-20 border-t border-border/50 bg-card/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-lg"
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImagesSelected}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div className="px-3 pb-3 pt-2">
        {/* Attachment options panel (shown when + toggled) */}
        {showAttachments && (
          <AttachmentsPanel
            onOpenPromptTemplates={onOpenPromptTemplates}
            canAttachImages={canAttachImages}
            canAttachFiles={canAttachFiles}
            onImagePickerClick={() => imageInputRef.current?.click()}
            onFilePickerClick={() => fileInputRef.current?.click()}
          />
        )}

        {/* Attachment errors */}
        {attachmentErrors.length > 0 && (
          <div className="mb-2 space-y-1">
            {attachmentErrors.map((err, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Attachment preview chips */}
        {hasAttachments && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {attachedImages.map((file, i) => (
              <AttachmentChip
                key={`img-${i}`}
                file={file}
                previewUrl={imagePreviewUrls[i]}
                onRemove={() => removeImage(i)}
              />
            ))}
            {attachedFiles.map((file, i) => (
              <AttachmentChip
                key={`file-${i}`}
                file={file}
                onRemove={() => removeFile(i)}
              />
            ))}
          </div>
        )}

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
            onChange={(e) => {
              setInputText(e.target.value);
              // Clear attachment errors when user types
              if (attachmentErrors.length > 0) setAttachmentErrors([]);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={modelInfo.isAvailable ? `Ask ${modelInfo.providerName} anything...` : 'Current model unavailable — change in settings'}
            className="max-h-[80px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-tight text-foreground outline-none placeholder:text-muted-foreground/50"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() && !hasAttachments}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-95 disabled:opacity-40"
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
