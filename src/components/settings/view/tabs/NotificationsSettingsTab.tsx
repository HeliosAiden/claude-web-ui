import { Bell, BellOff, BellRing, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NotificationPreferencesState, TelegramConfigState } from '../../types/types';

type NotificationsSettingsTabProps = {
  notificationPreferences: NotificationPreferencesState;
  onNotificationPreferencesChange: (value: NotificationPreferencesState) => void;
  pushPermission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
  isPushLoading: boolean;
  onEnablePush: () => void;
  onDisablePush: () => void;
  telegramConfig: TelegramConfigState;
  onTelegramConfigChange: (value: TelegramConfigState) => void;
};

export default function NotificationsSettingsTab({
  notificationPreferences,
  onNotificationPreferencesChange,
  pushPermission,
  isPushSubscribed,
  isPushLoading,
  onEnablePush,
  onDisablePush,
  telegramConfig,
  onTelegramConfigChange,
}: NotificationsSettingsTabProps) {
  const { t } = useTranslation('settings');

  const pushSupported = pushPermission !== 'unsupported';
  const pushDenied = pushPermission === 'denied';

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-foreground">{t('notifications.title')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('notifications.description')}</p>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-lg p-4">
        <h4 className="font-medium text-foreground">{t('notifications.webPush.title')}</h4>
        {!pushSupported ? (
          <p className="text-sm text-muted-foreground">{t('notifications.webPush.unsupported')}</p>
        ) : pushDenied ? (
          <p className="text-sm text-muted-foreground">{t('notifications.webPush.denied')}</p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPushLoading}
              onClick={() => {
                if (isPushSubscribed) {
                  onDisablePush();
                } else {
                  onEnablePush();
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isPushSubscribed
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                  : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
              }`}
            >
              {isPushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPushSubscribed ? (
                <BellOff className="w-4 h-4" />
              ) : (
                <BellRing className="w-4 h-4" />
              )}
              {isPushLoading
                ? t('notifications.webPush.loading')
                : isPushSubscribed
                  ? t('notifications.webPush.disable')
                  : t('notifications.webPush.enable')}
            </button>
            {isPushSubscribed && (
              <span className="text-sm text-green-600 dark:text-green-400">
                {t('notifications.webPush.enabled')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Telegram Section */}
      <div className="space-y-4 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <h4 className="font-medium text-foreground">{t('notifications.telegram.title')}</h4>
          </div>
          {telegramConfig.configured && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={telegramConfig.enabled}
                onChange={(e) => {
                  onTelegramConfigChange({ ...telegramConfig, enabled: e.target.checked });
                  onNotificationPreferencesChange({
                    ...notificationPreferences,
                    channels: { ...notificationPreferences.channels, telegram: e.target.checked },
                  });
                }}
                className="w-4 h-4"
              />
              {t('notifications.telegram.enabled')}
            </label>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{t('notifications.telegram.description')}</p>

        {telegramConfig.configured ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('notifications.telegram.botToken')}: {telegramConfig.botTokenMasked}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('notifications.telegram.chatId')}: {telegramConfig.chatId}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onTelegramConfigChange({
                  configured: false,
                  enabled: false,
                  botToken: '',
                  chatId: '',
                  botTokenMasked: '',
                });
                onNotificationPreferencesChange({
                  ...notificationPreferences,
                  channels: { ...notificationPreferences.channels, telegram: false },
                });
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('notifications.telegram.remove')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('notifications.telegram.botTokenLabel')}
              </label>
              <input
                type="password"
                value={telegramConfig.botToken || ''}
                onChange={(e) => onTelegramConfigChange({ ...telegramConfig, botToken: e.target.value })}
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('notifications.telegram.botTokenHelp')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('notifications.telegram.chatIdLabel')}
              </label>
              <input
                type="text"
                value={telegramConfig.chatId || ''}
                onChange={(e) => onTelegramConfigChange({ ...telegramConfig, chatId: e.target.value })}
                placeholder="123456789"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('notifications.telegram.chatIdHelp')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 bg-card border border-border rounded-lg p-4">
        <h4 className="font-medium text-foreground">{t('notifications.events.title')}</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={notificationPreferences.events.actionRequired}
              onChange={(event) =>
                onNotificationPreferencesChange({
                  ...notificationPreferences,
                  events: {
                    ...notificationPreferences.events,
                    actionRequired: event.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            {t('notifications.events.actionRequired')}
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={notificationPreferences.events.stop}
              onChange={(event) =>
                onNotificationPreferencesChange({
                  ...notificationPreferences,
                  events: {
                    ...notificationPreferences.events,
                    stop: event.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            {t('notifications.events.stop')}
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={notificationPreferences.events.error}
              onChange={(event) =>
                onNotificationPreferencesChange({
                  ...notificationPreferences,
                  events: {
                    ...notificationPreferences.events,
                    error: event.target.checked,
                  },
                })
              }
              className="w-4 h-4"
            />
            {t('notifications.events.error')}
          </label>
        </div>
      </div>
    </div>
  );
}
