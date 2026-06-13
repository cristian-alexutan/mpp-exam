const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// POST /api/articles/:articleId/react  — 'user' role only
router.post('/', requireAuth, requireRole('user'), (req, res) => {
  const { type } = req.body;
  if (type !== 'like' && type !== 'dislike') {
    return res.status(400).json({ error: 'type must be like or dislike' });
  }

  const db = req.db;
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.articleId);
  if (!article) return res.status(404).json({ error: 'Not found' });

  const existing = db.prepare(
    'SELECT id, type FROM reactions WHERE article_id = ? AND user_id = ?'
  ).get(req.params.articleId, req.user.id);

  if (existing) {
    if (existing.type === type) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
    } else {
      db.prepare('UPDATE reactions SET type = ? WHERE id = ?').run(type, existing.id);
    }
  } else {
    db.prepare('INSERT INTO reactions (article_id, user_id, type) VALUES (?, ?, ?)').run(
      req.params.articleId, req.user.id, type
    );
  }

  const likes = db.prepare("SELECT COUNT(*) as c FROM reactions WHERE article_id = ? AND type = 'like'").get(req.params.articleId).c;
  const dislikes = db.prepare("SELECT COUNT(*) as c FROM reactions WHERE article_id = ? AND type = 'dislike'").get(req.params.articleId).c;
  const userReaction = db.prepare('SELECT type FROM reactions WHERE article_id = ? AND user_id = ?').get(req.params.articleId, req.user.id)?.type ?? null;

  res.json({ likes, dislikes, userReaction });
});

module.exports = router;
