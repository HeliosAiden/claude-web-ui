import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { usePromptTemplatesSettings } from '../../../hooks/usePromptTemplatesSettings';
import type { PromptTemplate } from '../../../hooks/usePromptTemplatesSettings';

import TemplateEditorModal from './TemplateEditorModal';

export default function TemplatesSettingsTab() {
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Prompt Templates</h3>
            <p className="text-sm text-muted-foreground">Create and manage reusable prompt templates</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-shimmer rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Prompt Templates</h3>
          <p className="text-sm text-muted-foreground">Create and manage reusable prompt templates</p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No templates yet</p>
          <p className="text-xs text-muted-foreground">
            Create your first template or use the Template button in the chat composer
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-start justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                  {template.category && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {template.category}
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {template.content.slice(0, 80)}
                  {template.content.length > 80 ? '...' : ''}
                </p>
              </div>

              <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(template)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Edit template"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(template)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
