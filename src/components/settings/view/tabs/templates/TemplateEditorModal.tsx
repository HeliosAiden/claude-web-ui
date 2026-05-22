import { useEffect, useMemo, useState } from 'react';
import type { PromptTemplate } from '../../../hooks/usePromptTemplatesSettings';

type TemplateEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; content: string; description?: string; category?: string }) => Promise<boolean>;
  template?: PromptTemplate | null;
  existingCategories: string[];
  initialContent?: string;
};

export default function TemplateEditorModal({
  open,
  onOpenChange,
  onSave,
  template,
  existingCategories,
  initialContent = '',
}: TemplateEditorModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);

  const isEditing = Boolean(template);

  const MAX_VISIBLE_CHIPS = 5;
  const visibleCategories = useMemo(() => {
    const sorted = [...existingCategories].sort();
    return showAllCategories ? sorted : sorted.slice(0, MAX_VISIBLE_CHIPS);
  }, [existingCategories, showAllCategories]);
  const hasMore = existingCategories.length > MAX_VISIBLE_CHIPS;

  useEffect(() => {
    if (open) {
      setName(template?.name || '');
      setContent(template?.content || initialContent || '');
      setDescription(template?.description || '');
      setCategory(template?.category || '');
      setError('');
    }
  }, [open, template, initialContent]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();

    if (!trimmedName) {
      setError('Template name is required');
      return;
    }
    if (!trimmedContent) {
      setError('Template content is required');
      return;
    }

    setSaving(true);
    setError('');

    const success = await onSave({
      name: trimmedName,
      content: trimmedContent,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });

    setSaving(false);

    if (success) {
      onOpenChange(false);
    } else {
      setError('Failed to save template');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Overlay */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
      />

      {/* Content */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border bg-popover text-popover-foreground shadow-lg">
        <div className="flex flex-col gap-4 p-6 overflow-y-auto">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Template' : 'New Template'}
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Code Review"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of when to use this template"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Category (optional)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. code-review, testing, documentation"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {existingCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {visibleCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory((prev) => (prev === cat ? '' : cat))}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      category === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted-foreground/15 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {hasMore && !showAllCategories && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(true)}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                  >
                    +{existingCategories.length - MAX_VISIBLE_CHIPS} more
                  </button>
                )}
                {showAllCategories && hasMore && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(false)}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                  >
                    show less
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Write your template content here...\n\nUse {{placeholder}} for variables that will be filled when inserting the template.`}
              rows={8}
              className="min-h-[160px] resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Use {'{{placeholder}}'} for variables that will be filled when inserting the template.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
