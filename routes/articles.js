const express = require('express');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { romanianDate, touchArticleDate } = require('../utils/date');

const router = express.Router();

const VALID_STATUSES = ['started', 'pending', 'finished'];
const EDITOR_ROLES = ['editor', 'admin'];

function isEditor(user) {
  return user && EDITOR_ROLES.includes(user.role);
}

function validateTitle(title) {
  if (!title || typeof title !== 'string' || !title.trim()) return 'Title is required';
  if (title.trim().length > 200) return 'Title must be under 200 characters';
  return null;
}

function getArticleWithRelations(db, id, includeComments = false) {
  const article = db.prepare('SELECT id, title, date, status FROM articles WHERE id = ?').get(id);
  if (!article) return null;

  const paragraphs = db.prepare(
    'SELECT id, text, order_index FROM paragraphs WHERE article_id = ? ORDER BY order_index'
  ).all(article.id);

  for (const para of paragraphs) {
    para.images = db.prepare('SELECT id, path FROM images WHERE paragraph_id = ?').all(para.id);
    if (includeComments) {
      para.comments = db.prepare(`
        SELECT c.id, c.text, c.created_at, u.username as author
        FROM comments c JOIN users u ON u.id = c.created_by
        WHERE c.paragraph_id = ? ORDER BY c.created_at
      `).all(para.id);
    }
  }

  article.paragraphs = paragraphs;
  article.journalists = db.prepare(`
    SELECT u.id, u.username FROM users u
    JOIN article_journalists aj ON aj.journalist_id = u.id
    WHERE aj.article_id = ?
  `).all(article.id);

  return article;
}

// GET /api/articles — editors see all, others see only finished
router.get('/', optionalAuth, (req, res) => {
  const query = isEditor(req.user)
    ? 'SELECT id, title, date, status FROM articles ORDER BY id DESC'
    : "SELECT id, title, date, status FROM articles WHERE status = 'finished' ORDER BY id DESC";
  res.json(req.db.prepare(query).all());
});

// GET /api/articles/:id — editors see any status, others only finished
router.get('/:id', optionalAuth, (req, res) => {
  const article = getArticleWithRelations(req.db, req.params.id, isEditor(req.user));
  if (!article) return res.status(404).json({ error: 'Not found' });
  if (article.status !== 'finished' && !isEditor(req.user)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(article);
});

// POST /api/articles — date is always today
router.post('/', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const error = validateTitle(req.body.title);
  if (error) return res.status(400).json({ error });

  const title = req.body.title.trim();
  const date = romanianDate();
  const { lastInsertRowid: id } = req.db.prepare(
    'INSERT INTO articles (title, date, status, created_by) VALUES (?, ?, ?, ?)'
  ).run(title, date, 'started', req.user.id);

  res.status(201).json({ id, title, date, status: 'started', paragraphs: [], journalists: [] });
});

// PUT /api/articles/:id — updates title, resets date to today
router.put('/:id', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const error = validateTitle(req.body.title);
  if (error) return res.status(400).json({ error });

  const article = req.db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });

  const title = req.body.title.trim();
  const date = romanianDate();
  req.db.prepare('UPDATE articles SET title = ?, date = ? WHERE id = ?').run(title, date, req.params.id);
  res.json({ id: Number(req.params.id), title, date });
});

// PATCH /api/articles/:id/status — editor+, updates date
router.patch('/:id/status', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const article = req.db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });

  const date = romanianDate();
  req.db.prepare('UPDATE articles SET status = ?, date = ? WHERE id = ?').run(status, date, req.params.id);
  res.json({ id: Number(req.params.id), status, date });
});

// PUT /api/articles/:id/journalists — editor+, updates date
router.put('/:id/journalists', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const { journalistIds } = req.body;
  if (!Array.isArray(journalistIds)) return res.status(400).json({ error: 'journalistIds must be an array' });
  if (journalistIds.length > 2) return res.status(400).json({ error: 'Maximum 2 journalists per article' });

  const article = req.db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });

  for (const jid of journalistIds) {
    if (!Number.isInteger(jid)) return res.status(400).json({ error: 'Each journalist ID must be an integer' });
    const user = req.db.prepare('SELECT role FROM users WHERE id = ?').get(jid);
    if (!user || user.role !== 'journalist') return res.status(400).json({ error: `User ${jid} is not a journalist` });
  }

  req.db.prepare('DELETE FROM article_journalists WHERE article_id = ?').run(req.params.id);
  const insert = req.db.prepare('INSERT INTO article_journalists (article_id, journalist_id) VALUES (?, ?)');
  for (const jid of journalistIds) insert.run(req.params.id, jid);

  touchArticleDate(req.db, req.params.id);
  res.json({ articleId: Number(req.params.id), journalistIds });
});

module.exports = router;
