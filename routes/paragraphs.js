const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { touchArticleDate } = require('../utils/date');

function canEditArticle(db, user, articleId) {
  if (!user) return false;
  if (user.role === 'editor' || user.role === 'admin') return true;
  if (user.role === 'journalist') {
    return !!db.prepare(
      'SELECT 1 FROM article_journalists WHERE article_id = ? AND journalist_id = ?'
    ).get(articleId, user.id);
  }
  return false;
}

// Mounted at /api/articles/:articleId/paragraphs
const createRouter = express.Router({ mergeParams: true });

createRouter.post('/', requireAuth, (req, res) => {
  const db = req.db;
  if (!canEditArticle(db, req.user, req.params.articleId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Paragraph text is required' });
  }

  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.articleId);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const { max } = db.prepare('SELECT MAX(order_index) as max FROM paragraphs WHERE article_id = ?').get(req.params.articleId);
  const orderIndex = (max ?? -1) + 1;

  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO paragraphs (text, article_id, order_index) VALUES (?, ?, ?)'
  ).run(text.trim(), req.params.articleId, orderIndex);

  touchArticleDate(db, req.params.articleId);

  res.status(201).json({ id, text: text.trim(), order_index: orderIndex, images: [] });
});

// Mounted at /api/paragraphs
const crudRouter = express.Router();

crudRouter.put('/:id', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Paragraph text is required' });
  }

  const db = req.db;
  const para = db.prepare('SELECT id, article_id FROM paragraphs WHERE id = ?').get(req.params.id);
  if (!para) return res.status(404).json({ error: 'Not found' });

  if (!canEditArticle(db, req.user, para.article_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('UPDATE paragraphs SET text = ? WHERE id = ?').run(text.trim(), req.params.id);
  touchArticleDate(db, para.article_id);

  res.json({ id: Number(req.params.id), text: text.trim() });
});

crudRouter.patch('/:id/move', requireAuth, (req, res) => {
  const { direction } = req.body;
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'direction must be up or down' });
  }

  const db = req.db;
  const para = db.prepare('SELECT id, article_id, order_index FROM paragraphs WHERE id = ?').get(req.params.id);
  if (!para) return res.status(404).json({ error: 'Not found' });

  if (!canEditArticle(db, req.user, para.article_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const adjacent = direction === 'up'
    ? db.prepare('SELECT id, order_index FROM paragraphs WHERE article_id = ? AND order_index < ? ORDER BY order_index DESC LIMIT 1').get(para.article_id, para.order_index)
    : db.prepare('SELECT id, order_index FROM paragraphs WHERE article_id = ? AND order_index > ? ORDER BY order_index ASC LIMIT 1').get(para.article_id, para.order_index);

  if (!adjacent) return res.status(400).json({ error: 'Cannot move in that direction' });

  db.prepare('UPDATE paragraphs SET order_index = ? WHERE id = ?').run(adjacent.order_index, para.id);
  db.prepare('UPDATE paragraphs SET order_index = ? WHERE id = ?').run(para.order_index, adjacent.id);
  touchArticleDate(db, para.article_id);

  res.json({ success: true });
});

crudRouter.delete('/:id', requireAuth, (req, res) => {
  const db = req.db;
  const para = db.prepare('SELECT id, article_id FROM paragraphs WHERE id = ?').get(req.params.id);
  if (!para) return res.status(404).json({ error: 'Not found' });

  if (!canEditArticle(db, req.user, para.article_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('DELETE FROM paragraphs WHERE id = ?').run(req.params.id);
  touchArticleDate(db, para.article_id);

  res.json({ success: true });
});

module.exports = { createRouter, crudRouter };
