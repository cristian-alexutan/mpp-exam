const express = require('express');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { romanianDate, touchArticleDate } = require('../utils/date');

const router = express.Router();

const VALID_STATUSES = ['started', 'pending', 'finished'];
const EDITOR_ROLES = ['editor', 'admin'];

function isEditor(user) {
  return user && EDITOR_ROLES.includes(user.role);
}

function isJournalist(user) {
  return user && user.role === 'journalist';
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
        SELECT c.id, c.text, c.created_at, c.status, u.username as author
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

// GET /api/articles
// ?mine=true  — journalist only: returns only their assigned articles (for edit list)
router.get('/', optionalAuth, (req, res) => {
  const db = req.db;

  if (isEditor(req.user)) {
    return res.json(db.prepare('SELECT id, title, date, status FROM articles ORDER BY id DESC').all());
  }

  if (isJournalist(req.user)) {
    if (req.query.mine === 'true') {
      return res.json(db.prepare(`
        SELECT a.id, a.title, a.date, a.status FROM articles a
        JOIN article_journalists aj ON aj.article_id = a.id
        WHERE aj.journalist_id = ?
        ORDER BY a.id DESC
      `).all(req.user.id));
    }
    return res.json(db.prepare(`
      SELECT DISTINCT id, title, date, status FROM articles
      WHERE status = 'finished'
         OR id IN (SELECT article_id FROM article_journalists WHERE journalist_id = ?)
      ORDER BY id DESC
    `).all(req.user.id));
  }

  res.json(db.prepare("SELECT id, title, date, status FROM articles WHERE status = 'finished' ORDER BY id DESC").all());
});

// GET /api/articles/:id
router.get('/:id', optionalAuth, (req, res) => {
  const db = req.db;
  const editorAccess = isEditor(req.user);
  const journalistAccess = isJournalist(req.user);
  const includeComments = editorAccess || journalistAccess;

  const article = getArticleWithRelations(db, req.params.id, includeComments);
  if (!article) return res.status(404).json({ error: 'Not found' });

  if (article.status !== 'finished') {
    if (editorAccess) {
      // always allowed
    } else if (journalistAccess) {
      const assigned = db.prepare(
        'SELECT 1 FROM article_journalists WHERE article_id = ? AND journalist_id = ?'
      ).get(req.params.id, req.user.id);
      if (!assigned) return res.status(404).json({ error: 'Not found' });
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  res.json(article);
});

// POST /api/articles — editor+ only
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

// PUT /api/articles/:id — editor+ only
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

// PATCH /api/articles/:id/status — editor+ only
router.patch('/:id/status', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const db = req.db;
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });

  if (status === 'finished') {
    const { count } = db.prepare(`
      SELECT COUNT(*) as count FROM comments c
      JOIN paragraphs p ON p.id = c.paragraph_id
      WHERE p.article_id = ? AND c.status = 'unresolved'
    `).get(req.params.id);
    if (count > 0) {
      return res.status(400).json({
        error: `Nu se poate finaliza: există ${count} comentari${count === 1 ? 'u' : 'i'} nerezolvat${count === 1 ? '' : 'e'}`
      });
    }
  }

  const date = romanianDate();
  db.prepare('UPDATE articles SET status = ?, date = ? WHERE id = ?').run(status, date, req.params.id);
  res.json({ id: Number(req.params.id), status, date });
});

// PUT /api/articles/:id/journalists — editor+ only
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
