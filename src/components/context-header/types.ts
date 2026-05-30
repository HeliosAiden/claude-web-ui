import type { AppTab, Project, ProjectSession } from '../../types/app';

export type ContextHeaderProps = {
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  activeTab: AppTab;
  onTabSelect: (tab: AppTab) => void;
  projects: Project[];
  isMobile: boolean;
  onProjectSelect: (project: Project) => void;
  onSessionSelect: (session: ProjectSession) => void;
  onNewSession: (project: Project) => void;
};

export type ProjectSelectorProps = {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
};

export type SessionSelectorProps = {
  sessions: ProjectSession[];
  selectedSession: ProjectSession | null;
  onSessionSelect: (session: ProjectSession) => void;
  visible: boolean;
};
