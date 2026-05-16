import { messageBookmarksDb } from '@/modules/database/index.js';
import type { MessageBookmarkRow } from '@/modules/database/index.js';
import { AppError } from '@/shared/utils.js';

type ToggleBookmarkInput = {
  messageUuid: string;
  sessionId: string;
  contentSnippet: string;
  provider: string;
  role: string;
  messageTimestamp: string;
  projectId?: string | null;
};

function normalizeInput(input: ToggleBookmarkInput): ToggleBookmarkInput {
  return {
    messageUuid: input.messageUuid.trim(),
    sessionId: input.sessionId.trim(),
    contentSnippet: String(input.contentSnippet || '').slice(0, 500),
    provider: input.provider || 'claude',
    role: input.role || 'assistant',
    messageTimestamp: input.messageTimestamp || new Date().toISOString(),
    projectId: input.projectId?.trim() || null,
  };
}

function toBookmarkResponse(row: MessageBookmarkRow) {
  return {
    id: row.id,
    messageUuid: row.message_uuid,
    sessionId: row.session_id,
    contentSnippet: row.content_snippet,
    provider: row.provider,
    role: row.role,
    messageTimestamp: row.message_timestamp,
    projectId: row.project_id,
    createdAt: row.created_at,
  };
}

export function toggleMessageBookmark(
  userId: number,
  input: ToggleBookmarkInput,
): { bookmarked: boolean } {
  const normalized = normalizeInput(input);
  if (!normalized.messageUuid || !normalized.sessionId) {
    throw new AppError('messageUuid and sessionId are required', {
      code: 'BOOKMARK_INPUT_REQUIRED',
      statusCode: 400,
    });
  }
  return messageBookmarksDb.toggle(userId, normalized);
}

export function getBookmarkedMessageUuids(
  userId: number,
  messageUuids: string[],
): { bookmarkedUuids: string[] } {
  const set = messageBookmarksDb.getBookmarkedMessageUuids(userId, messageUuids);
  return { bookmarkedUuids: [...set] };
}

export function deleteBookmark(userId: number, messageUuid: string): { deleted: boolean } {
  if (!messageUuid || !messageUuid.trim()) {
    throw new AppError('messageUuid is required', {
      code: 'BOOKMARK_DELETE_REQUIRED',
      statusCode: 400,
    });
  }
  const deleted = messageBookmarksDb.delete(userId, messageUuid.trim());
  return { deleted };
}

export function listBookmarks(
  userId: number,
  opts: { limit?: number; offset?: number; sessionId?: string },
) {
  const result = messageBookmarksDb.listByUser(userId, opts);
  return {
    bookmarks: result.bookmarks.map(toBookmarkResponse),
    total: result.total,
  };
}
