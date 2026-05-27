import type { ReactNode } from 'react';

interface ChatPageProps {
  mainContent: ReactNode;
}

export default function ChatPage({ mainContent }: ChatPageProps) {
  return <div className="flex min-h-0 flex-1 flex-col">{mainContent}</div>;
}
