/**
 * Cryptographic utilities for secret storage.
 *
 * Provides AES-256-GCM encryption for values that must be decrypted at
 * runtime (credential tokens, VAPID private keys, Telegram bot tokens)
 * and SHA-256 hashing for values that are only ever compared (API keys).
 *
 * The encryption key is auto-generated on first boot and persisted in
 * app_config.  Set ENCRYPTION_KEY (64 hex chars = 256 bits) to keep the
 * key outside the database in production deployments.
 */

import crypto from 'node:crypto';

import { appConfigDb } from '@/modules/database/repositories/app-config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

// ---------------------------------------------------------------------------
// Encryption key management
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    return Buffer.from(envKey, 'hex');
  }

  let keyHex = appConfigDb.get('encryption_key');
  if (!keyHex) {
    keyHex = crypto.randomBytes(KEY_LENGTH).toString('hex');
    appConfigDb.set('encryption_key', keyHex);
  }
  return Buffer.from(keyHex, 'hex');
}

// ---------------------------------------------------------------------------
// AES-256-GCM encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string.
 * Returns: "hex(iv):hex(authTag):hex(ciphertext)"
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ct = cipher.update(plaintext, 'utf8', 'hex');
  ct += cipher.final('hex');

  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ct}`;
}

/**
 * Decrypts a string previously produced by encrypt().
 * Throws on tampered data or invalid format (GCM authentication failure).
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(parts[0], 'hex'),
  );
  decipher.setAuthTag(Buffer.from(parts[1], 'hex'));

  let pt = decipher.update(parts[2], 'hex', 'utf8');
  pt += decipher.final('utf8');
  return pt;
}

// ---------------------------------------------------------------------------
// API key hashing
// ---------------------------------------------------------------------------

/** SHA-256 hex digest — used for one-way API key storage and comparison. */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/** First 10 characters of a raw API key, for UI display. */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 10);
}

/** Sentinel stored in app_config when the plaintext migration has run. */
export const MIGRATION_SENTINEL = 'migrated_plaintext_secrets';
