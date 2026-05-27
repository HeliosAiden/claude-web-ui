import React from 'react';
import ActivityBar from '../activity-bar/ActivityBar';
import ProjectsFlyout from '../projects-flyout/ProjectsFlyout';
import type { WorkspaceShellProps } from './workspaceShellTypes';

function MobileWorkspaceShell({
  activeActivity,
  onActivitySelect,
  onShowSettings,
  pluginActivities,
  flyoutOpen,
  setFlyoutOpen,
  sidebarContent,
  mainContent,
}: WorkspaceShellProps) {
  return (
    <div data-layout="mobile" className="mobile-workspace fixed inset-0 bg-background">
      <ProjectsFlyout
        mode="overlay"
        isOpen={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
      >
        {sidebarContent}
      </ProjectsFlyout>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {mainContent}
      </div>

      <ActivityBar
        activeActivity={activeActivity}
        onActivitySelect={onActivitySelect}
        isMobile={true}
        onShowSettings={onShowSettings}
        pluginActivities={pluginActivities}
      />
    </div>
  );
}

export default React.memo(MobileWorkspaceShell);
