import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { MobileTabId } from '../types/mobile';

function tabFromPathname(pathname: string): MobileTabId {
  if (pathname === '/conversations') return 'conversations';
  if (pathname === '/settings') return 'settings';
  return 'chat';
}

export function useMobileNavigation({
  selectedSessionId,
}: {
  selectedSessionId?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const historyRef = useRef<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [overrideTab, setOverrideTab] = useState<MobileTabId | null>(null);

  // Clear override when the URL changes externally (e.g. direct navigation)
  useEffect(() => {
    setOverrideTab(null);
  }, [location.pathname]);

  const activeTab = useMemo((): MobileTabId => {
    return overrideTab ?? tabFromPathname(location.pathname);
  }, [overrideTab, location.pathname]);

  const trackHistory = useCallback(
    (tab: MobileTabId) => {
      historyRef.current = [...historyRef.current.slice(-4), tab];
    },
    [],
  );

  const navigateToTab = useCallback(
    (tab: MobileTabId) => {
      trackHistory(tab);
      setSheetOpen(false);

      switch (tab) {
        case 'conversations':
          setOverrideTab(null);
          navigate('/conversations');
          break;
        case 'files':
          setOverrideTab('files');
          break;
        case 'chat':
          setOverrideTab(null);
          if (selectedSessionId) {
            navigate(`/session/${selectedSessionId}`);
          } else {
            navigate('/');
          }
          break;
        case 'git':
          setOverrideTab('git');
          break;
        case 'settings':
          setOverrideTab(null);
          navigate('/settings');
          break;
      }
    },
    [navigate, selectedSessionId, trackHistory],
  );

  const handleChatHubTap = useCallback(() => {
    if (activeTab === 'chat') {
      setSheetOpen((prev) => !prev);
    } else {
      navigateToTab('chat');
    }
  }, [activeTab, navigateToTab]);

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
    goBack,
    currentPath: location.pathname,
    overrideTab,
  };
}
