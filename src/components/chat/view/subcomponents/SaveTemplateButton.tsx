import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { authenticatedFetch } from '../../../../utils/api';

type SaveTemplateButtonProps = {
  content: string;
  isUserMessage?: boolean;
};

export default function SaveTemplateButton({ content, isUserMessage = false }: SaveTemplateButtonProps) {
  const [saved, setSaved] = useState(false);

  const unsavedClass = isUserMessage
    ? 'text-blue-100 hover:text-white'
    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300';

  const handleSave = async () => {
    const name = window.prompt('Template name:');
    if (!name || !name.trim()) return;

    try {
      const response = await authenticatedFetch('/api/prompt-templates', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), content }),
      });
      const payload = await response.json();
      if (payload.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      className={`rounded p-0.5 transition-colors ${
        saved
          ? 'text-green-500 hover:text-green-400'
          : unsavedClass
      }`}
      title={saved ? 'Template saved' : 'Save as template'}
    >
      <FileDown className="h-3.5 w-3.5" />
    </button>
  );
}
