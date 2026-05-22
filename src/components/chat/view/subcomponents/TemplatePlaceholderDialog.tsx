import { useCallback, useEffect, useMemo, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
} from '../../../../shared/view/ui';

const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

type PlaceholderFillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onConfirm: (substitutedContent: string) => void;
};

export default function TemplatePlaceholderDialog({
  open,
  onOpenChange,
  content,
  onConfirm,
}: PlaceholderFillDialogProps) {
  const placeholders = useMemo(() => {
    const names = new Set<string>();
    let match;
    while ((match = PLACEHOLDER_REGEX.exec(content)) !== null) {
      names.add(match[1]);
    }
    return Array.from(names);
  }, [content]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({});
    }
  }, [open]);

  const handleValueChange = useCallback(
    (name: string, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    let result = content;
    for (const name of placeholders) {
      const value = values[name] ?? '';
      result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
    }
    onConfirm(result);
  }, [content, placeholders, values, onConfirm]);

  const labelFromName = (name: string) =>
    name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] w-full max-w-lg flex-col p-0 overflow-hidden"
        onPointerDownOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <DialogTitle>Fill Template Placeholders</DialogTitle>

        <div className="shrink-0 px-6 pt-6 pb-2">
          <h3 className="text-sm font-medium text-foreground">Fill in the placeholders</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fill in the values below and they will be inserted into the template.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-3 pb-4">
            {placeholders.map((name) => (
              <div key={name} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`placeholder-${name}`}
                  className="text-sm font-medium text-foreground"
                >
                  {labelFromName(name)}
                </label>
                <input
                  id={`placeholder-${name}`}
                  type="text"
                  value={values[name] ?? ''}
                  onChange={(e) => handleValueChange(name, e.target.value)}
                  placeholder={`{{${name}}}`}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus={placeholders.indexOf(name) === 0}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 pb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Preview</label>
              <button
                type="button"
                onClick={() => setPreviewExpanded((prev) => !prev)}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {previewExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div
              className={`overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground ${previewExpanded ? 'max-h-[40vh]' : 'max-h-24'}`}
            >
              {content}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Insert Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
