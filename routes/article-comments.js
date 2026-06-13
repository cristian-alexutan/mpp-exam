const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3.2';
const VALID_SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed', 'sarcastic'];

async function analyzeSentiment(text) {
  try {
    const prompt =
      'Classify the sentiment of the following comment with exactly one word from this list: ' +
      'positive, negative, neutral, mixed, sarcastic.\n' +
      'positive = genuinely supportive or happy.\n' +
      'negative = critical, upset, or disappointed.\n' +
      'neutral = factual or indifferent.\n' +
      'mixed = both positive and negative elements.\n' +
      'sarcastic = ironic or mocking tone.\n' +
      'Reply with ONLY the single classification word, nothing else.\n\n' +
      'Comment: ' + text;

    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const lower = (data.response || '').toLowerCase();

    for (const s of VALID_SENTIMENTS) {
      if (lower.includes(s)) return s;
    }
    return null;
  } catch (err) {
    console.error('[sentiment] ollama error:', err.message);
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

router.post('/', requireAuth, requireRole('user'), async (req, res) => {
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

  const sentiment = await analyzeSentiment(text.trim());
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
