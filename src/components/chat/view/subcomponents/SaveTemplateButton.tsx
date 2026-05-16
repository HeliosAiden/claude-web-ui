import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { authenticatedFetch } from '../../../../utils/api';

type SaveTemplateButtonProps = {
  content: string;
};

export default function SaveTemplateButton({ content }: SaveTemplateButtonProps) {
  const [saved, setSaved] = useState(false);

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
          : 'text-muted-foreground/50 hover:text-muted-foreground'
      }`}
      title={saved ? 'Template saved' : 'Save as template'}
    >
      <Bookmark className="h-3.5 w-3.5" />
    </button>
  );
}
