import { getConnection } from '@/modules/database/connection.js';

export type TelegramConfig = {
  userId: number;
  botToken: string;
  chatId: string;
  enabled: boolean;
};

type TelegramConfigRow = {
  user_id: number;
  bot_token: string;
  chat_id: string;
  enabled: number;
};

export const telegramConfigDb = {
  getConfig(userId: number): TelegramConfig | null {
    const db = getConnection();
    const row = db
      .prepare('SELECT user_id, bot_token, chat_id, enabled FROM telegram_config WHERE user_id = ?')
      .get(userId) as TelegramConfigRow | undefined;
    if (!row) return null;
    return {
      userId: row.user_id,
      botToken: row.bot_token,
      chatId: row.chat_id,
      enabled: row.enabled === 1,
    };
  },

  getAllEnabledConfigs(): TelegramConfig[] {
    const db = getConnection();
    const rows = db
      .prepare('SELECT user_id, bot_token, chat_id, enabled FROM telegram_config WHERE enabled = 1')
      .all() as TelegramConfigRow[];
    return rows.map((row) => ({
      userId: row.user_id,
      botToken: row.bot_token,
      chatId: row.chat_id,
      enabled: row.enabled === 1,
    }));
  },

  upsertConfig(userId: number, botToken: string, chatId: string, enabled: boolean): TelegramConfig {
    const db = getConnection();
    db.prepare(
      `INSERT INTO telegram_config (user_id, bot_token, chat_id, enabled, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         bot_token = excluded.bot_token,
         chat_id = excluded.chat_id,
         enabled = excluded.enabled,
         updated_at = CURRENT_TIMESTAMP`
    ).run(userId, botToken, chatId, enabled ? 1 : 0);
    return { userId, botToken, chatId, enabled };
  },

  deleteConfig(userId: number): void {
    const db = getConnection();
    db.prepare('DELETE FROM telegram_config WHERE user_id = ?').run(userId);
  },
};
