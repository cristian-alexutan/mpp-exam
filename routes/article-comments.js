const express = require('express');
const { execSync } = require('child_process');
const { requireAuth, requireRole } = require('../middleware/auth');

const VALID_SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed', 'sarcastic'];

function analyzeSentiment(text) {
  try {
    // Sanitize for safe shell embedding: replace " and control chars
    const safe = text.replace(/["\r\n`]/g, ' ').trim();

    const prompt =
      `Classify the sentiment of this comment with exactly one word from: ` +
      `positive, negative, neutral, mixed, sarcastic. ` +
      `Positive = genuinely supportive. Negative = critical or upset. ` +
      `Neutral = factual or indifferent. Mixed = both positive and negative. ` +
      `Sarcastic = ironic or mocking tone. ` +
      `Reply with the single word only, no punctuation. Comment: ${safe}`;

    const output = execSync(`opencode run "${prompt}"`, {
      encoding: 'utf8',
      timeout: 30000,
    });

    // Search the entire output for any valid sentiment word
    const lower = output.toLowerCase();
    for (const s of VALID_SENTIMENTS) {
      if (lower.includes(s)) return s;
    }
    return null;
  } catch (err) {
    console.error('[sentiment] error:', err.message);
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
  console.log('[sentiment]', JSON.stringify(text.trim().slice(0, 60)), '->', sentiment);

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
