import type { ReactNode } from 'react';

import PromptTemplateList from '../prompt-templates/PromptTemplateList';

interface ChatPageProps {
  mainContent: ReactNode;
  showTemplates?: boolean;
  onTemplateSelect?: (content: string) => void;
  onTemplateBack?: () => void;
}

export default function ChatPage({
  mainContent,
  showTemplates = false,
  onTemplateSelect,
  onTemplateBack,
}: ChatPageProps) {
  if (showTemplates && onTemplateSelect && onTemplateBack) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PromptTemplateList onSelect={onTemplateSelect} onBack={onTemplateBack} />
      </div>
    );
  }

  return <div className="flex h-full min-h-0 flex-col">{mainContent}</div>;
}
