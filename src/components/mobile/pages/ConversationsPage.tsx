import type { ReactNode } from 'react';

interface ConversationsPageProps {
  sidebarContent: ReactNode;
}

export default function ConversationsPage({ sidebarContent }: ConversationsPageProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        {sidebarContent}
      </div>
    </div>
  );
}
