import { getConnection } from '@/modules/database/connection.js';

export type MessageBookmarkRow = {
  id: number;
  user_id: number;
  message_uuid: string;
  session_id: string;
  content_snippet: string;
  provider: string;
  role: string;
  message_timestamp: string;
  project_id: string | null;
  created_at: string;
};

type ToggleInput = {
  messageUuid: string;
  sessionId: string;
  contentSnippet: string;
  provider: string;
  role: string;
  messageTimestamp: string;
  projectId?: string | null;
};

export const messageBookmarksDb = {
  toggle(userId: number, data: ToggleInput): { bookmarked: boolean } {
    const db = getConnection();
    const existing = db.prepare(`
      SELECT id FROM message_bookmarks
      WHERE user_id = ? AND message_uuid = ?
    `).get(userId, data.messageUuid) as { id: number } | undefined;

    if (existing) {
      db.prepare(`
        DELETE FROM message_bookmarks
        WHERE user_id = ? AND message_uuid = ?
      `).run(userId, data.messageUuid);
      return { bookmarked: false };
    }

    db.prepare(`
      INSERT INTO message_bookmarks (
        user_id, message_uuid, session_id, content_snippet,
        provider, role, message_timestamp, project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.messageUuid,
      data.sessionId,
      data.contentSnippet,
      data.provider,
      data.role,
      data.messageTimestamp,
      data.projectId || null,
    );
    return { bookmarked: true };
  },

  isBookmarked(userId: number, messageUuid: string): boolean {
    const db = getConnection();
    const row = db.prepare(`
      SELECT 1 FROM message_bookmarks
      WHERE user_id = ? AND message_uuid = ?
    `).get(userId, messageUuid);
    return Boolean(row);
  },

  getBookmarkedMessageUuids(userId: number, messageUuids: string[]): Set<string> {
    if (messageUuids.length === 0) {
      return new Set();
    }

    const db = getConnection();
    const placeholders = messageUuids.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT message_uuid FROM message_bookmarks
      WHERE user_id = ? AND message_uuid IN (${placeholders})
    `).all(userId, ...messageUuids) as { message_uuid: string }[];

    return new Set(rows.map((r) => r.message_uuid));
  },

  listByUser(userId: number, opts: { limit?: number; offset?: number; sessionId?: string }): {
    bookmarks: MessageBookmarkRow[];
    total: number;
  } {
    const db = getConnection();
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    if (opts.sessionId) {
      const totalRow = db.prepare(`
        SELECT COUNT(*) AS count FROM message_bookmarks WHERE user_id = ? AND session_id = ?
      `).get(userId, opts.sessionId) as { count: number };

      const bookmarks = db.prepare(`
        SELECT * FROM message_bookmarks
        WHERE user_id = ? AND session_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, opts.sessionId, limit, offset) as MessageBookmarkRow[];

      return { bookmarks, total: totalRow.count };
    }

    const totalRow = db.prepare(`
      SELECT COUNT(*) AS count FROM message_bookmarks WHERE user_id = ?
    `).get(userId) as { count: number };

    const bookmarks = db.prepare(`
      SELECT * FROM message_bookmarks
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as MessageBookmarkRow[];

    return { bookmarks, total: totalRow.count };
  },

  delete(userId: number, messageUuid: string): boolean {
    const db = getConnection();
    const result = db.prepare(`
      DELETE FROM message_bookmarks
      WHERE user_id = ? AND message_uuid = ?
    `).run(userId, messageUuid);
    return result.changes > 0;
  },
};
