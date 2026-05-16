import { useCallback, useEffect, useState } from 'react';
import { FileText, Layers } from 'lucide-react';
import { authenticatedFetch } from '../../../../utils/api';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  PromptInputButton,
} from '../../../../shared/view/ui';

type PromptTemplate = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  category: string;
};

type TemplatesResponse = {
  success: boolean;
  templates: PromptTemplate[];
};

type TemplatePickerPopoverProps = {
  onInsertTemplate: (content: string) => void;
};

export default function TemplatePickerPopover({
  onInsertTemplate,
}: TemplatePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/prompt-templates');
      const payload = (await response.json()) as TemplatesResponse;
      if (payload.success) {
        setTemplates(payload.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, fetchTemplates]);

  const handleSelect = useCallback(
    (template: PromptTemplate) => {
      onInsertTemplate(template.content);
      setOpen(false);
    },
    [onInsertTemplate]
  );

  const groupedTemplates = templates.reduce<Record<string, PromptTemplate[]>>(
    (acc, t) => {
      const cat = t.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PromptInputButton tooltip={{ content: 'Insert template' }}>
          <Layers />
        </PromptInputButton>
      </DialogTrigger>

      <DialogContent
        className="w-full max-w-md"
        onPointerDownOutside={() => setOpen(false)}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <DialogTitle>Insert Template</DialogTitle>

        <Command className="p-2">
          <CommandInput placeholder="Search templates..." />
          <CommandList className="max-h-64">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-1 py-6 text-center">
                <p className="text-sm text-muted-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground">
                  Create templates in Settings → Templates
                </p>
              </div>
            </CommandEmpty>

            {Object.entries(groupedTemplates).map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map((template) => (
                  <CommandItem
                    key={template.id}
                    value={`${template.name} ${template.description || ''}`}
                    onSelect={() => handleSelect(template)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                    {template.description && (
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
