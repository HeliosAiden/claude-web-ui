import express from 'express';
import { apiKeysDb, appConfigDb, credentialsDb, notificationPreferencesDb, pushSubscriptionsDb, telegramConfigDb } from '../modules/database/index.js';
import { WORKSPACES_ROOT, setWorkspaceRoot } from '../shared/utils.js';
import { getPublicKey } from '../services/vapid-keys.js';
import { createNotificationEvent, notifyUserIfEnabled } from '../services/notification-orchestrator.js';
import {
  ensureBotForToken,
  registerChatForToken,
  unregisterChatForToken,
} from '../services/telegram-bot.js';

const router = express.Router();

// ===============================
// API Keys Management
// ===============================

// Get all API keys for the authenticated user
router.get('/api-keys', async (req, res) => {
  try {
    const apiKeys = apiKeysDb.getApiKeys(req.user.id);
    // Don't send the full API key in the list for security
    const sanitizedKeys = apiKeys.map(key => ({
      ...key,
      api_key: key.api_key.substring(0, 10) + '...'
    }));
    res.json({ apiKeys: sanitizedKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create a new API key
router.post('/api-keys', async (req, res) => {
  try {
    const { keyName } = req.body;

    if (!keyName || !keyName.trim()) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    const result = apiKeysDb.createApiKey(req.user.id, keyName.trim());
    res.json({
      success: true,
      apiKey: result
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Delete an API key
router.delete('/api-keys/:keyId', async (req, res) => {
  try {
    const { keyId } = req.params;
    const success = apiKeysDb.deleteApiKey(req.user.id, parseInt(keyId));

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Toggle API key active status
router.patch('/api-keys/:keyId/toggle', async (req, res) => {
  try {
    const { keyId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const success = apiKeysDb.toggleApiKey(req.user.id, parseInt(keyId), isActive);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }
  } catch (error) {
    console.error('Error toggling API key:', error);
    res.status(500).json({ error: 'Failed to toggle API key' });
  }
});

// ===============================
// Generic Credentials Management
// ===============================

// Get all credentials for the authenticated user (optionally filtered by type)
router.get('/credentials', async (req, res) => {
  try {
    const { type } = req.query;
    const credentials = credentialsDb.getCredentials(req.user.id, type || null);
    // Don't send the actual credential values for security
    res.json({ credentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// Create a new credential
router.post('/credentials', async (req, res) => {
  try {
    const { credentialName, credentialType, credentialValue, description } = req.body;

    if (!credentialName || !credentialName.trim()) {
      return res.status(400).json({ error: 'Credential name is required' });
    }

    if (!credentialType || !credentialType.trim()) {
      return res.status(400).json({ error: 'Credential type is required' });
    }

    if (!credentialValue || !credentialValue.trim()) {
      return res.status(400).json({ error: 'Credential value is required' });
    }

    const result = credentialsDb.createCredential(
      req.user.id,
      credentialName.trim(),
      credentialType.trim(),
      credentialValue.trim(),
      description?.trim() || null
    );

    res.json({
      success: true,
      credential: result
    });
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// Delete a credential
router.delete('/credentials/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const success = credentialsDb.deleteCredential(req.user.id, parseInt(credentialId));

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Credential not found' });
    }
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

// Toggle credential active status
router.patch('/credentials/:credentialId/toggle', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const success = credentialsDb.toggleCredential(req.user.id, parseInt(credentialId), isActive);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Credential not found' });
    }
  } catch (error) {
    console.error('Error toggling credential:', error);
    res.status(500).json({ error: 'Failed to toggle credential' });
  }
});

// ===============================
// Notification Preferences
// ===============================

router.get('/notification-preferences', async (req, res) => {
  try {
    const preferences = notificationPreferencesDb.getPreferences(req.user.id);
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

router.put('/notification-preferences', async (req, res) => {
  try {
    const preferences = notificationPreferencesDb.updatePreferences(req.user.id, req.body || {});
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    res.status(500).json({ error: 'Failed to save notification preferences' });
  }
});

// ===============================
// Push Subscription Management
// ===============================

router.get('/push/vapid-public-key', async (req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    res.status(500).json({ error: 'Failed to fetch VAPID public key' });
  }
});

router.post('/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing subscription fields' });
    }
    pushSubscriptionsDb.saveSubscription(req.user.id, endpoint, keys.p256dh, keys.auth);

    // Enable webPush in preferences so the confirmation goes through the full pipeline
    const currentPrefs = notificationPreferencesDb.getPreferences(req.user.id);
    if (!currentPrefs?.channels?.webPush) {
      notificationPreferencesDb.updatePreferences(req.user.id, {
        ...currentPrefs,
        channels: { ...currentPrefs?.channels, webPush: true },
      });
    }

    res.json({ success: true });

    // Send a confirmation push through the full notification pipeline
    const event = createNotificationEvent({
      provider: 'system',
      kind: 'info',
      code: 'push.enabled',
      meta: { message: 'Push notifications are now enabled!' },
      severity: 'info'
    });
    notifyUserIfEnabled({ userId: req.user.id, event });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

router.post('/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }
    pushSubscriptionsDb.removeSubscription(endpoint);

    // Disable webPush in preferences to match subscription state
    const currentPrefs = notificationPreferencesDb.getPreferences(req.user.id);
    if (currentPrefs?.channels?.webPush) {
      notificationPreferencesDb.updatePreferences(req.user.id, {
        ...currentPrefs,
        channels: { ...currentPrefs.channels, webPush: false },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// ===============================
// Telegram Notification Config
// ===============================

router.get('/telegram-config', async (req, res) => {
  try {
    const config = telegramConfigDb.getConfig(req.user.id);
    if (!config) {
      return res.json({ configured: false });
    }
    res.json({
      configured: true,
      enabled: config.enabled,
      chatId: config.chatId,
      botTokenMasked: config.botToken.substring(0, 8) + '...' + config.botToken.substring(config.botToken.length - 4),
    });
  } catch (error) {
    console.error('Error fetching Telegram config:', error);
    res.status(500).json({ error: 'Failed to fetch Telegram config' });
  }
});

router.put('/telegram-config', async (req, res) => {
  try {
    const { botToken, chatId, enabled } = req.body;

    if (!botToken || !botToken.trim()) {
      const existing = telegramConfigDb.getConfig(req.user.id);
      if (existing) {
        unregisterChatForToken(existing.botToken, existing.chatId);
        telegramConfigDb.deleteConfig(req.user.id);
      }
      return res.json({ success: true, configured: false });
    }

    if (!chatId || !chatId.trim()) {
      return res.status(400).json({ error: 'Chat ID is required when bot token is provided' });
    }

    const existing = telegramConfigDb.getConfig(req.user.id);
    if (existing && existing.botToken !== botToken.trim()) {
      unregisterChatForToken(existing.botToken, existing.chatId);
    }

    ensureBotForToken(botToken.trim());
    registerChatForToken(botToken.trim(), chatId.trim());

    const config = telegramConfigDb.upsertConfig(
      req.user.id,
      botToken.trim(),
      chatId.trim(),
      enabled !== false
    );

    res.json({
      success: true,
      configured: true,
      enabled: config.enabled,
      chatId: config.chatId,
      botTokenMasked: botToken.substring(0, 8) + '...' + botToken.substring(botToken.length - 4),
    });
  } catch (error) {
    console.error('Error saving Telegram config:', error);
    res.status(500).json({ error: 'Failed to save Telegram config' });
  }
});

router.patch('/telegram-config/toggle', async (req, res) => {
  try {
    const existing = telegramConfigDb.getConfig(req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'No Telegram config found' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const config = telegramConfigDb.upsertConfig(
      req.user.id,
      existing.botToken,
      existing.chatId,
      enabled
    );

    if (!enabled) {
      unregisterChatForToken(existing.botToken, existing.chatId);
    } else {
      ensureBotForToken(existing.botToken);
      registerChatForToken(existing.botToken, existing.chatId);
    }

    res.json({ success: true, enabled: config.enabled });
  } catch (error) {
    console.error('Error toggling Telegram config:', error);
    res.status(500).json({ error: 'Failed to toggle Telegram config' });
  }
});

// Host OS for UI (e.g. hide Cursor agent when the backend runs on Windows).
router.get('/server-env', async (req, res) => {
  try {
    res.json({ platform: process.platform });
  } catch (error) {
    console.error('Error reading server environment:', error);
    res.status(500).json({ error: 'Failed to read server environment' });
  }
});

// Get the current workspace root.
router.get('/workspace-root', async (req, res) => {
  try {
    res.json({ root: WORKSPACES_ROOT });
  } catch (error) {
    console.error('Error reading workspace root:', error);
    res.status(500).json({ error: 'Failed to read workspace root' });
  }
});

// Update the workspace root at runtime.
router.put('/workspace-root', async (req, res) => {
  try {
    const { root } = req.body;
    if (!root || typeof root !== 'string' || !root.trim()) {
      return res.status(400).json({ error: 'Workspace root must be a non-empty string' });
    }
    const trimmed = root.trim();
    appConfigDb.set('workspace_root', trimmed);
    setWorkspaceRoot(trimmed);
    res.json({ root: WORKSPACES_ROOT });
  } catch (error) {
    console.error('Error updating workspace root:', error);
    res.status(500).json({ error: 'Failed to update workspace root' });
  }
});

export default router;
