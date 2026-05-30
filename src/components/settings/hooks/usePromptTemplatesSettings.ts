import { useCallback, useEffect, useState } from 'react';

import { authenticatedFetch } from '../../../utils/api';

export type PromptTemplate = {
  id: string;
  user_id: number;
  name: string;
  content: string;
  description: string | null;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TemplatesResponse = {
  success: boolean;
  templates: PromptTemplate[];
  error?: string;
};

type TemplateResponse = {
  success: boolean;
  template: PromptTemplate;
  error?: string;
};

type CreateData = {
  name: string;
  content: string;
  description?: string;
  category?: string;
  sortOrder?: number;
};

type UpdateData = {
  name?: string;
  content?: string;
  description?: string;
  category?: string;
  sortOrder?: number;
};

export function usePromptTemplatesSettings() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/prompt-templates');
      const payload = (await response.json()) as TemplatesResponse;
      if (payload.success) {
        setTemplates(payload.templates);
      }
    } catch (error) {
      console.error('Error fetching prompt templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(
    async (data: CreateData): Promise<boolean> => {
      try {
        const response = await authenticatedFetch('/api/prompt-templates', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        const payload = (await response.json()) as TemplateResponse;
        if (!response.ok || !payload.success) {
          console.error('Error creating template:', payload.error);
          return false;
        }
        await fetchTemplates();
        return true;
      } catch (error) {
        console.error('Error creating template:', error);
        return false;
      }
    },
    [fetchTemplates]
  );

  const updateTemplate = useCallback(
    async (id: string, data: UpdateData): Promise<boolean> => {
      try {
        const response = await authenticatedFetch(
          `/api/prompt-templates/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify(data),
          }
        );
        const payload = (await response.json()) as TemplateResponse;
        if (!response.ok || !payload.success) {
          console.error('Error updating template:', payload.error);
          return false;
        }
        await fetchTemplates();
        return true;
      } catch (error) {
        console.error('Error updating template:', error);
        return false;
      }
    },
    [fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await authenticatedFetch(
          `/api/prompt-templates/${id}`,
          { method: 'DELETE' }
        );
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          console.error('Error deleting template:', payload.error);
          return false;
        }
        await fetchTemplates();
        return true;
      } catch (error) {
        console.error('Error deleting template:', error);
        return false;
      }
    },
    [fetchTemplates]
  );

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}
