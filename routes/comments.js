const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

// Mounted at /api/paragraphs/:paragraphId/comments
const createRouter = express.Router({ mergeParams: true });

createRouter.post('/', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const db = req.db;
  const para = db.prepare('SELECT id FROM paragraphs WHERE id = ?').get(req.params.paragraphId);
  if (!para) return res.status(404).json({ error: 'Paragraph not found' });

  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO comments (text, paragraph_id, created_by) VALUES (?, ?, ?)'
  ).run(text.trim(), req.params.paragraphId, req.user.id);

  const comment = db.prepare(`
    SELECT c.id, c.text, c.created_at, u.username as author
    FROM comments c JOIN users u ON u.id = c.created_by
    WHERE c.id = ?
  `).get(id);

  res.status(201).json(comment);
});

// Mounted at /api/comments
const deleteRouter = express.Router();

deleteRouter.delete('/:id', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const comment = req.db.prepare('SELECT id FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  req.db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = { createRouter, deleteRouter };
