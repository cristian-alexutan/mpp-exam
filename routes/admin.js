const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats — admin only
router.get('/stats', requireAuth, requireRole('admin'), (req, res) => {
  const db = req.db;

  const articles = db.prepare(`
    SELECT
      a.id,
      a.title,
      a.date,
      a.status,
      COALESCE(SUM(CASE WHEN r.type = 'like'    THEN 1 ELSE 0 END), 0) AS likes,
      COALESCE(SUM(CASE WHEN r.type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes
    FROM articles a
    LEFT JOIN reactions r ON r.article_id = a.id
    GROUP BY a.id
    ORDER BY (likes + dislikes) DESC, a.id DESC
  `).all();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'like'    THEN 1 ELSE 0 END), 0) AS totalLikes,
      COALESCE(SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END), 0) AS totalDislikes,
      COUNT(DISTINCT user_id) AS uniqueVoters
    FROM reactions
  `).get();

  res.json({ articles, totals });
});

module.exports = router;
