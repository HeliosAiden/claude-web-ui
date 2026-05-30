import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSettingsController } from '../../settings/hooks/useSettingsController';
import SettingsSidebar from '../../settings/view/SettingsSidebar';
import AgentsSettingsTab from '../../settings/view/tabs/agents-settings/AgentsSettingsTab';
import AppearanceSettingsTab from '../../settings/view/tabs/AppearanceSettingsTab';
import CredentialsSettingsTab from '../../settings/view/tabs/api-settings/CredentialsSettingsTab';
import GitSettingsTab from '../../settings/view/tabs/git-settings/GitSettingsTab';
import PluginSettingsTab from '../../plugins/view/PluginSettingsTab';

interface SettingsPageProps {
  onClose: () => void;
}

export default function SettingsPage({ onClose }: SettingsPageProps) {
  const { t } = useTranslation('settings');
  const {
    activeTab,
    setActiveTab,
    saveStatus,
    projectSortOrder,
    setProjectSortOrder,
    codeEditorSettings,
    updateCodeEditorSetting,
    claudePermissions,
    setClaudePermissions,
    cursorPermissions,
    setCursorPermissions,
    codexPermissionMode,
    setCodexPermissionMode,
    providerAuthStatus,
    geminiPermissionMode,
    setGeminiPermissionMode,
    openLoginForProvider,
    workspaceRoot,
    setWorkspaceRoot,
  } = useSettingsController({ isOpen: true, initialTab: 'agents' });

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground active:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        {saveStatus === 'success' && (
          <span className="ml-auto text-xs text-muted-foreground">{t('saveStatus.success')}</span>
        )}
      </div>

      <SettingsSidebar activeTab={activeTab} onChange={setActiveTab} />

      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'var(--mobile-scroll-bottom-inset)' }}
      >
        <div className="space-y-6 p-4">
          {activeTab === 'appearance' && (
            <AppearanceSettingsTab
              projectSortOrder={projectSortOrder}
              onProjectSortOrderChange={setProjectSortOrder}
              codeEditorSettings={codeEditorSettings}
              onCodeEditorThemeChange={(v) => updateCodeEditorSetting('theme', v)}
              onCodeEditorWordWrapChange={(v) => updateCodeEditorSetting('wordWrap', v)}
              onCodeEditorShowMinimapChange={(v) => updateCodeEditorSetting('showMinimap', v)}
              onCodeEditorLineNumbersChange={(v) => updateCodeEditorSetting('lineNumbers', v)}
              onCodeEditorFontSizeChange={(v) => updateCodeEditorSetting('fontSize', v)}
              workspaceRoot={workspaceRoot}
              onWorkspaceRootChange={setWorkspaceRoot}
            />
          )}
          {activeTab === 'agents' && (
            <AgentsSettingsTab
              providerAuthStatus={providerAuthStatus}
              onProviderLogin={openLoginForProvider}
              claudePermissions={claudePermissions}
              onClaudePermissionsChange={setClaudePermissions}
              cursorPermissions={cursorPermissions}
              onCursorPermissionsChange={setCursorPermissions}
              codexPermissionMode={codexPermissionMode}
              onCodexPermissionModeChange={setCodexPermissionMode}
              geminiPermissionMode={geminiPermissionMode}
              onGeminiPermissionModeChange={setGeminiPermissionMode}
              projects={[]}
            />
          )}
          {activeTab === 'api' && <CredentialsSettingsTab />}
          {activeTab === 'git' && <GitSettingsTab />}
          {activeTab === 'plugins' && <PluginSettingsTab />}
        </div>
      </main>
    </div>
  );
}
