import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { authenticatedFetch } from '../../../../utils/api';
import TemplateEditorModal from '../../../settings/view/tabs/templates/TemplateEditorModal';

type SaveTemplateButtonProps = {
  content: string;
  isUserMessage?: boolean;
};

export default function SaveTemplateButton({ content, isUserMessage = false }: SaveTemplateButtonProps) {
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const unsavedClass = isUserMessage
    ? 'text-blue-100 hover:text-white'
    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300';

  const handleSave = async (data: {
    name: string;
    content: string;
    description?: string;
    category?: string;
  }): Promise<boolean> => {
    try {
      const response = await authenticatedFetch('/api/prompt-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (payload.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`rounded p-0.5 transition-colors ${
          saved
            ? 'text-green-500 hover:text-green-400'
            : unsavedClass
        }`}
        title={saved ? 'Template saved' : 'Save as template'}
      >
        <FileDown className="h-3.5 w-3.5" />
      </button>
      <TemplateEditorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        existingCategories={[]}
        initialContent={content}
      />
    </>
  );
}
