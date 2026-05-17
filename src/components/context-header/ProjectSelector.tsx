import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, Folder, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ProjectSelectorProps } from './types';

function ProjectSelector({ projects, selectedProject, onProjectSelect }: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.fullPath.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const handleSelect = useCallback(
    (project: typeof projects[0]) => {
      onProjectSelect(project);
      setOpen(false);
      setSearch('');
    },
    [onProjectSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    },
    [],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2 rounded-md text-sm',
          'hover:bg-accent/50 transition-colors',
          'border border-transparent hover:border-border/60',
          open && 'bg-accent/50 border-border/60',
        )}
      >
        <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="max-w-[140px] truncate font-medium">
          {selectedProject?.displayName || 'Select Project'}
        </span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => {
              setOpen(false);
              setSearch('');
            }}
            aria-label="Close project selector"
          />
          <div
            className="absolute left-0 top-full mt-1 z-40 w-64 rounded-lg border border-border/50 bg-popover shadow-lg"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No projects found
                </p>
              ) : (
                filtered.map((project) => (
                  <button
                    key={project.projectId}
                    type="button"
                    onClick={() => handleSelect(project)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      'hover:bg-accent/60',
                      selectedProject?.projectId === project.projectId && 'bg-accent/40 font-medium',
                    )}
                  >
                    <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{project.displayName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {project.fullPath}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(ProjectSelector);
