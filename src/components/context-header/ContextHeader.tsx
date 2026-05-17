import React, { useMemo } from 'react';
import { Menu, Plus, RefreshCw, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Project, ProjectSession } from '../../types/app';
import ProjectSelector from './ProjectSelector';
import SessionSelector from './SessionSelector';
import type { ContextHeaderProps } from './types';

function getProjectSessions(project: Project): ProjectSession[] {
  return [
    ...(project.sessions ?? []),
    ...(project.codexSessions ?? []),
    ...(project.cursorSessions ?? []),
    ...(project.geminiSessions ?? []),
  ];
}

function ContextHeader({
  selectedProject,
  selectedSession,
  activeActivity: _activeActivity,
  activeTab,
  projects,
  isMobile,
  onProjectSelect,
  onSessionSelect,
  onNewSession,
  onMenuClick,
}: ContextHeaderProps) {
  const sessions = useMemo(() => {
    if (!selectedProject) return [];
    return getProjectSessions(selectedProject);
  }, [selectedProject]);

  const showSessionSelector = activeTab === 'chat' || activeTab === 'shell';

  const activityLabel = useMemo(() => {
    switch (activeTab) {
      case 'chat': return 'Chat';
      case 'shell': return 'Shell';
      case 'files': return 'Files';
      case 'git': return 'Source Control';
      case 'preview': return 'Preview';
      default:
        if (activeTab?.startsWith('plugin:')) {
          return activeTab.replace('plugin:', '');
        }
        return '';
    }
  }, [activeTab]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 h-10 px-3',
        'border-b border-border/40 bg-card/50',
        'flex-shrink-0',
      )}
    >
      {/* Mobile menu button */}
      {isMobile && onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent/50 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* Project selector */}
      <ProjectSelector
        projects={projects}
        selectedProject={selectedProject}
        onProjectSelect={onProjectSelect}
      />

      {/* Session selector (chat/shell only) */}
      {showSessionSelector && (
        <>
          <span className="w-px h-5 bg-border/60 flex-shrink-0" />
          <SessionSelector
            sessions={sessions}
            selectedSession={selectedSession}
            onSessionSelect={onSessionSelect}
            visible={true}
          />
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Context-aware actions */}
      <div className="flex items-center gap-1">
        {activeTab === 'chat' && selectedProject && (
          <button
            type="button"
            onClick={() => onNewSession(selectedProject)}
            className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="New Chat"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        )}
        {activeTab === 'shell' && selectedProject && (
          <button
            type="button"
            onClick={() => onNewSession(selectedProject)}
            className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="New Terminal"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Terminal</span>
          </button>
        )}
        {activeTab === 'files' && (
          <button
            type="button"
            className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Refresh files"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Activity label */}
        <span className="text-[11px] text-muted-foreground/60 font-medium hidden sm:block ml-1">
          {activityLabel}
        </span>
      </div>
    </div>
  );
}

export default React.memo(ContextHeader);
