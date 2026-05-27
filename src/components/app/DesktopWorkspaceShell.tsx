import React from 'react';
import ActivityBar from '../activity-bar/ActivityBar';
import ProjectsFlyout from '../projects-flyout/ProjectsFlyout';
import type { WorkspaceShellProps } from './workspaceShellTypes';

function DesktopWorkspaceShell({
  activeActivity,
  onActivitySelect,
  onShowSettings,
  pluginActivities,
  flyoutOpen,
  sidebarContent,
  mainContent,
}: WorkspaceShellProps) {
  return (
    <div className="fixed inset-0 flex bg-background" style={{ bottom: 'var(--keyboard-height, 0px)' }}>
      <ActivityBar
        activeActivity={activeActivity}
        onActivitySelect={onActivitySelect}
        isMobile={false}
        onShowSettings={onShowSettings}
        pluginActivities={pluginActivities}
      />

      <ProjectsFlyout mode="sidebar" isOpen={flyoutOpen}>
        {sidebarContent}
      </ProjectsFlyout>

      <div className="flex min-w-0 flex-1 flex-col">
        {mainContent}
      </div>
    </div>
  );
}

export default React.memo(DesktopWorkspaceShell);
