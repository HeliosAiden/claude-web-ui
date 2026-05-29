import type { ReactNode } from 'react';

interface ChatPageProps {
  mainContent: ReactNode;
}

export default function ChatPage({ mainContent }: ChatPageProps) {
  return <div className="flex h-full min-h-0 flex-col">{mainContent}</div>;
}
