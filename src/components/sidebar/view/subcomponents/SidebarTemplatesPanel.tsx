import { useMemo, useState } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePromptTemplatesSettings } from '../../../../hooks/usePromptTemplatesSettings';
import type { PromptTemplate } from '../../../../hooks/usePromptTemplatesSettings';
import TemplateEditorModal from '../../../settings/view/tabs/templates/TemplateEditorModal';

export default function SidebarTemplatesPanel() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } =
    usePromptTemplatesSettings();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const existingCategories = useMemo(
    () => [...new Set(templates.map((t) => t.category).filter(Boolean))],
    [templates]
  );

  const handleNew = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    content: string;
    description?: string;
    category?: string;
  }) => {
    if (editingTemplate) {
      return updateTemplate(editingTemplate.id, data);
    }
    return createTemplate(data);
  };

  const handleDelete = async (template: PromptTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    await deleteTemplate(template.id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">Templates</h3>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-shimmer rounded-lg bg-muted" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No templates yet</p>
            <p className="text-xs text-muted-foreground/70">
              Create your first template
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate text-sm font-medium text-foreground">
                        {template.name}
                      </h4>
                      {template.category && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {template.category}
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                    <p className="truncate font-mono text-[11px] text-muted-foreground/70">
                      {template.content.slice(0, 60)}
                      {template.content.length > 60 ? '...' : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleEdit(template)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Edit template"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        template={editingTemplate}
        existingCategories={existingCategories}
      />
    </div>
  );
}
