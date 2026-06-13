const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

// Mounted at /api/articles/:articleId/paragraphs
const createRouter = express.Router({ mergeParams: true });

createRouter.post('/', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Paragraph text is required' });
  }

  const db = req.db;
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.articleId);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const { max } = db.prepare('SELECT MAX(order_index) as max FROM paragraphs WHERE article_id = ?').get(req.params.articleId);
  const orderIndex = (max ?? -1) + 1;

  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO paragraphs (text, article_id, order_index) VALUES (?, ?, ?)'
  ).run(text.trim(), req.params.articleId, orderIndex);

  res.status(201).json({ id, text: text.trim(), order_index: orderIndex, images: [] });
});

// Mounted at /api/paragraphs
const crudRouter = express.Router();

crudRouter.put('/:id', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Paragraph text is required' });
  }

  const db = req.db;
  const para = db.prepare('SELECT id FROM paragraphs WHERE id = ?').get(req.params.id);
  if (!para) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE paragraphs SET text = ? WHERE id = ?').run(text.trim(), req.params.id);
  res.json({ id: Number(req.params.id), text: text.trim() });
});

crudRouter.delete('/:id', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const db = req.db;
  const para = db.prepare('SELECT id FROM paragraphs WHERE id = ?').get(req.params.id);
  if (!para) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM paragraphs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = { createRouter, crudRouter };
