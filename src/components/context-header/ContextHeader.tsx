import React, { useMemo } from 'react';
import { Menu, MessageSquare, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Project, ProjectSession, AppTab } from '../../types/app';
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

const TABS: { id: AppTab; icon: typeof MessageSquare; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'shell', icon: Terminal, label: 'Shell' },
];

function ContextHeader({
  selectedProject,
  selectedSession,
  activeTab,
  onTabSelect,
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

  return (
    <div
      className={cn(
        'flex items-center gap-2 h-9 px-3',
        'border-b border-border/40 bg-card/50',
        'flex-shrink-0',
      )}
    >
      {/* Mobile menu button */}
      {isMobile && onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent/50 transition-colors flex-shrink-0"
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

      {/* Tab switcher — hidden on mobile, chat-only by default */}
      {!isMobile && (
        <div className="flex items-center" role="tablist" aria-label="Workspace mode">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabSelect(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2 text-xs font-medium transition-colors',
                  'border-b-2 -mb-[1px]',
                  isActive
                    ? 'border-foreground/80 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30',
                )}
              >
                <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(ContextHeader);
