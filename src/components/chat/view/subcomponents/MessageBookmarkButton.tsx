import { useState, useCallback, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../../../utils/api';

type MessageBookmarkButtonProps = {
  messageUuid: string;
  sessionId: string;
  contentSnippet: string;
  provider: string;
  role: string;
  messageTimestamp: string;
  projectId?: string | null;
  initiallyBookmarked?: boolean;
  isUserMessage?: boolean;
};

export default function MessageBookmarkButton({
  messageUuid,
  sessionId,
  contentSnippet,
  provider,
  role,
  messageTimestamp,
  projectId,
  initiallyBookmarked = false,
  isUserMessage = false,
}: MessageBookmarkButtonProps) {
  const { t } = useTranslation('bookmarks');
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [isToggling, setIsToggling] = useState(false);

  const unbookmarkedClass = isUserMessage
    ? 'text-blue-100 hover:text-white'
    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300';

  useEffect(() => {
    setBookmarked(initiallyBookmarked);
  }, [initiallyBookmarked]);

  const handleToggle = useCallback(async () => {
    if (isToggling || !messageUuid) return;
    setIsToggling(true);
    setBookmarked((prev) => !prev);
    try {
      const response = await authenticatedFetch('/api/projects/bookmarks/toggle', {
        method: 'POST',
        body: JSON.stringify({
          messageUuid,
          sessionId,
          contentSnippet: contentSnippet.slice(0, 500),
          provider,
          role,
          messageTimestamp,
          projectId: projectId || null,
        }),
      });
      const payload = (await response.json()) as { success?: boolean; bookmarked?: boolean };
      if (payload.success) {
        setBookmarked(Boolean(payload.bookmarked));
        window.dispatchEvent(new CustomEvent('bookmark-changed'));
      } else {
        setBookmarked((prev) => !prev);
      }
    } catch {
      setBookmarked((prev) => !prev);
    } finally {
      setIsToggling(false);
    }
  }, [isToggling, messageUuid, sessionId, contentSnippet, provider, role, messageTimestamp, projectId]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`rounded p-0.5 transition-all ${
        bookmarked
          ? 'text-yellow-500 hover:text-yellow-400 opacity-100'
          : unbookmarkedClass
      }`}
      title={bookmarked ? t('removeBookmark') : t('addBookmark')}
    >
      <Bookmark
        className={`h-3.5 w-3.5 ${bookmarked ? 'fill-current' : ''}`}
      />
    </button>
  );
}
