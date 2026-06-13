const express = require('express');
const { spawnSync } = require('child_process');
const { requireAuth, requireRole } = require('../middleware/auth');

const VALID_SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed'];

function analyzeSentiment(text) {
  try {
    const prompt =
      'Classify the sentiment of the following user comment. ' +
      'Respond with exactly one word — one of: positive, negative, neutral, mixed. ' +
      'No punctuation, no explanation, just the single word.\n\nComment: ' + text;

    const result = spawnSync('opencode', ['run', prompt], {
      encoding: 'utf8',
      timeout: 30000,
    });

    if (result.error || result.status !== 0) return null;

    const word = (result.stdout || '').trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, '');
    return VALID_SENTIMENTS.includes(word) ? word : null;
  } catch {
    return null;
  }
}

// Mounted at /api/articles/:articleId/user-comments
const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, (req, res) => {
  const db = req.db;
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.articleId);
  if (!article) return res.status(404).json({ error: 'Not found' });

  const comments = db.prepare(`
    SELECT ac.id, ac.text, ac.created_at, ac.sentiment, u.username as author
    FROM article_comments ac
    JOIN users u ON u.id = ac.created_by
    WHERE ac.article_id = ?
    ORDER BY ac.created_at ASC
  `).all(req.params.articleId);

  res.json(comments);
});

router.post('/', requireAuth, requireRole('user'), (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Textul comentariului este obligatoriu' });
  }
  if (text.trim().length > 1000) {
    return res.status(400).json({ error: 'Comentariul nu poate depăși 1000 de caractere' });
  }

  const db = req.db;
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.articleId);
  if (!article) return res.status(404).json({ error: 'Not found' });

  const sentiment = analyzeSentiment(text.trim());

  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO article_comments (text, article_id, created_by, sentiment) VALUES (?, ?, ?, ?)'
  ).run(text.trim(), req.params.articleId, req.user.id, sentiment);

  const comment = db.prepare(`
    SELECT ac.id, ac.text, ac.created_at, ac.sentiment, u.username as author
    FROM article_comments ac JOIN users u ON u.id = ac.created_by
    WHERE ac.id = ?
  `).get(id);

  res.status(201).json(comment);
});

module.exports = router;
