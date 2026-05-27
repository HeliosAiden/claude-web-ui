import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MobileTabId } from '../types/mobile';

export function useMobileNavigation({
  selectedSessionId,
  onNavigateToSession,
}: {
  selectedSessionId?: string;
  onNavigateToSession?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const historyRef = useRef<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeTab = useMemo((): MobileTabId => {
    const path = location.pathname;
    if (path === '/conversations') return 'conversations';
    if (/^\/session\/[^/]+\/files$/.test(path)) return 'files';
    if (/^\/session\/[^/]+\/git$/.test(path)) return 'git';
    if (path === '/settings') return 'settings';
    return 'chat';
  }, [location.pathname]);

  const trackHistory = useCallback(
    (tab: MobileTabId) => {
      historyRef.current = [...historyRef.current.slice(-4), tab];
    },
    [],
  );

  const isForwardNavigation = useCallback(
    (nextTab: MobileTabId): boolean => {
      const history = historyRef.current;
      if (history.length < 1) return true;
      const prev = history[history.length - 1];
      const order: MobileTabId[] = ['conversations', 'chat', 'files', 'git', 'settings'];
      return order.indexOf(nextTab) >= order.indexOf(prev as MobileTabId);
    },
    [],
  );

  const navigateToTab = useCallback(
    (tab: MobileTabId) => {
      trackHistory(tab);
      setSheetOpen(false);

      switch (tab) {
        case 'conversations':
          navigate('/conversations');
          break;
        case 'files':
          if (selectedSessionId) {
            navigate(`/session/${selectedSessionId}/files`);
          } else {
            navigate('/conversations');
          }
          break;
        case 'chat':
          if (selectedSessionId) {
            navigate(`/session/${selectedSessionId}`);
          } else {
            navigate('/');
          }
          break;
        case 'git':
          if (selectedSessionId) {
            navigate(`/session/${selectedSessionId}/git`);
          } else {
            navigate('/conversations');
          }
          break;
        case 'settings':
          navigate('/settings');
          break;
      }
    },
    [navigate, selectedSessionId, trackHistory],
  );

  const handleChatHubTap = useCallback(() => {
    const inChatSession = /^\/session\/[^/]+$/.test(location.pathname);
    if (inChatSession) {
      setSheetOpen((prev) => !prev);
    } else {
      navigateToTab('chat');
    }
  }, [location.pathname, navigateToTab]);

  const goBack = useCallback(() => {
    const history = historyRef.current;
    if (history.length > 1) {
      const prevTab = history[history.length - 2];
      navigateToTab(prevTab as MobileTabId);
    } else {
      navigate('/conversations');
    }
  }, [historyRef, navigate, navigateToTab]);

  return {
    activeTab,
    navigateToTab,
    handleChatHubTap,
    sheetOpen,
    setSheetOpen,
    isForwardNavigation,
    goBack,
    currentPath: location.pathname,
  };
}
