import crypto from 'crypto';
import { getConnection } from '@/modules/database/connection.js';

type PromptTemplateRow = {
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

type CreatePromptTemplateParams = {
  name: string;
  content: string;
  description?: string;
  category?: string;
  sortOrder?: number;
};

type UpdatePromptTemplateParams = {
  name?: string;
  content?: string;
  description?: string;
  category?: string;
  sortOrder?: number;
};

function generateId(): string {
  return 'pt_' + crypto.randomBytes(12).toString('hex');
}

export const promptTemplatesDb = {
  getAllByUser(userId: number): PromptTemplateRow[] {
    const db = getConnection();
    return db
      .prepare(
        'SELECT * FROM prompt_templates WHERE user_id = ? ORDER BY sort_order, name'
      )
      .all(userId) as PromptTemplateRow[];
  },

  getById(id: string, userId: number): PromptTemplateRow | undefined {
    const db = getConnection();
    return db
      .prepare(
        'SELECT * FROM prompt_templates WHERE id = ? AND user_id = ?'
      )
      .get(id, userId) as PromptTemplateRow | undefined;
  },

  create(userId: number, params: CreatePromptTemplateParams): PromptTemplateRow {
    const db = getConnection();
    const id = generateId();
    const template: PromptTemplateRow = {
      id,
      user_id: userId,
      name: params.name.trim(),
      content: params.content,
      description: params.description || null,
      category: params.category || 'general',
      sort_order: params.sortOrder ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO prompt_templates (id, user_id, name, content, description, category, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      template.id,
      template.user_id,
      template.name,
      template.content,
      template.description,
      template.category,
      template.sort_order
    );

    return template;
  },

  update(
    id: string,
    userId: number,
    params: UpdatePromptTemplateParams
  ): boolean {
    const db = getConnection();
    const existing = promptTemplatesDb.getById(id, userId);
    if (!existing) return false;

    const name = params.name !== undefined ? params.name.trim() : existing.name;
    const content = params.content !== undefined ? params.content : existing.content;
    const description =
      params.description !== undefined ? params.description : existing.description;
    const category =
      params.category !== undefined ? params.category : existing.category;
    const sortOrder =
      params.sortOrder !== undefined ? params.sortOrder : existing.sort_order;

    const result = db
      .prepare(
        `UPDATE prompt_templates
         SET name = ?, content = ?, description = ?, category = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
      )
      .run(name, content, description, category, sortOrder, id, userId);

    return result.changes > 0;
  },

  delete(id: string, userId: number): boolean {
    const db = getConnection();
    const result = db
      .prepare('DELETE FROM prompt_templates WHERE id = ? AND user_id = ?')
      .run(id, userId);
    return result.changes > 0;
  },
};
