import webPush from 'web-push';

import { vapidKeysDb } from '../modules/database/index.js';

let cachedKeys = null;

function ensureVapidKeys() {
  if (cachedKeys) return cachedKeys;

  const pair = vapidKeysDb.getVapidKeys();
  if (pair) {
    cachedKeys = pair;
    return cachedKeys;
  }

  const keys = webPush.generateVAPIDKeys();
  vapidKeysDb.createVapidKeys(keys.publicKey, keys.privateKey);
  cachedKeys = keys;
  return cachedKeys;
}

function getPublicKey() {
  return ensureVapidKeys().publicKey;
}

function configureWebPush() {
  const keys = ensureVapidKeys();
  webPush.setVapidDetails(
    'mailto:noreply@claudecodeui.local',
    keys.publicKey,
    keys.privateKey
  );
  console.log('Web Push notifications configured');
}

export { ensureVapidKeys, getPublicKey, configureWebPush };
