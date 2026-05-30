import express from 'express';

import { promptTemplatesDb } from '../modules/database/index.js';

const router = express.Router();

// List all prompt templates for the authenticated user
router.get('/', (req, res) => {
  try {
    const templates = promptTemplatesDb.getAllByUser(req.user.id);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    res.status(500).json({ error: 'Failed to fetch prompt templates' });
  }
});

// Create a new prompt template
router.post('/', (req, res) => {
  try {
    const { name, content, description, category, sortOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Template content is required' });
    }

    const template = promptTemplatesDb.create(req.user.id, {
      name: name.trim(),
      content,
      description,
      category,
      sortOrder,
    });

    res.json({ success: true, template });
  } catch (error) {
    console.error('Error creating prompt template:', error);
    res.status(500).json({ error: 'Failed to create prompt template' });
  }
});

// Update a prompt template
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, description, category, sortOrder } = req.body;

    const success = promptTemplatesDb.update(id, req.user.id, {
      name,
      content,
      description,
      category,
      sortOrder,
    });

    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updated = promptTemplatesDb.getById(id, req.user.id);
    res.json({ success: true, template: updated });
  } catch (error) {
    console.error('Error updating prompt template:', error);
    res.status(500).json({ error: 'Failed to update prompt template' });
  }
});

// Delete a prompt template
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = promptTemplatesDb.delete(id, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt template:', error);
    res.status(500).json({ error: 'Failed to delete prompt template' });
  }
});

export default router;
