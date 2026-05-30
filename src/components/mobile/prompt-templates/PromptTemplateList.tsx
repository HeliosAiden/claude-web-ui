import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Search, AlertCircle, RotateCcw } from 'lucide-react';

import { authenticatedFetch } from '../../../utils/api';

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

interface PromptTemplateListProps {
  onSelect: (content: string) => void;
  onBack: () => void;
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg px-3 py-3">
      <div className="h-5 w-5 shrink-0 rounded bg-muted-foreground/20" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-2/5 rounded bg-muted-foreground/20" />
        <div className="h-3 w-4/5 rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}

export default function PromptTemplateList({
  onSelect,
  onBack,
}: PromptTemplateListProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await authenticatedFetch('/api/prompt-templates');
      const payload = (await response.json()) as TemplatesResponse;
      if (payload.success) {
        setTemplates(payload.templates);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const groupedTemplates = useMemo(() => {
    const filtered = searchQuery.trim()
      ? templates.filter((t) => {
          const q = searchQuery.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            (t.description ?? '').toLowerCase().includes(q) ||
            t.content.toLowerCase().includes(q)
          );
        })
      : templates;

    const groups = filtered.reduce<Record<string, PromptTemplate[]>>(
      (acc, t) => {
        const cat = t.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(t);
        return acc;
      },
      {},
    );

    // Sort groups alphabetically; "General" always last
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b);
    });
  }, [templates, searchQuery]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent active:bg-accent"
          aria-label="Back to chat"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-base font-semibold text-foreground">Prompt Templates</h2>
      </div>

      {/* Search */}
      {!loading && !error && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-accent/40 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading && (
          <div className="mt-2 space-y-1" role="status" aria-label="Loading templates">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {error && (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Failed to load templates</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Couldn&apos;t fetch your prompt templates. Please try again.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTemplates}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/90"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && groupedTemplates.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            {searchQuery.trim() ? (
              <>
                <p className="text-sm font-medium text-foreground">No matching templates</p>
                <p className="text-xs text-muted-foreground">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground">
                  Create templates in Settings → Templates
                </p>
              </>
            )}
          </div>
        )}

        {!loading && !error && groupedTemplates.length > 0 && (
          <div className="mt-2 space-y-4">
            {groupedTemplates.map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-0.5">
                  {items.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onSelect(template.content)}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-accent/50 active:bg-accent"
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
