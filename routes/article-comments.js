const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3.2';
const VALID_SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed', 'sarcastic'];

const SPAM_LIMIT = 4;
const SPAM_WINDOW_MINUTES = 4;


async function checkVulgarity(text) {
  try {
    const prompt =
      'Does the following comment contain vulgar, offensive, or inappropriate language? ' +
      'This includes profanity, slurs, sexual content, or hate speech in Romanian or English. ' +
      'Answer with ONLY the word YES or NO.\n\n' +
      'Comment: ' + text;

    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return false;
    const data = await res.json();
    return (data.response || '').trim().toUpperCase().startsWith('YES');
  } catch (err) {
    console.error('[vulgarity] ollama error:', err.message);
    return false;
  }
}

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

function banUser(db, userId, reason, days) {
  db.prepare(
    "UPDATE users SET banned = 1, ban_reason = ?, ban_until = datetime('now', ?) WHERE id = ?"
  ).run(reason, `+${days} days`, userId);
  console.log(`[ban] user ${userId} banned for ${days} days: ${reason}`);
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

  // Check if currently banned
  const userRecord = db.prepare('SELECT banned, ban_reason, ban_until FROM users WHERE id = ?').get(req.user.id);
  if (userRecord.banned && userRecord.ban_until && new Date(userRecord.ban_until) > new Date()) {
    const until = new Date(userRecord.ban_until).toLocaleDateString('ro-RO');
    return res.status(403).json({
      error: `Contul tău este suspendat până pe ${until}: ${userRecord.ban_reason}`,
      banned: true,
    });
  }

  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.articleId);
  if (!article) return res.status(404).json({ error: 'Not found' });

  // Spam check
  const windowStart = new Date(Date.now() - SPAM_WINDOW_MINUTES * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 19);
  const { count } = db.prepare(
    'SELECT COUNT(*) as count FROM article_comments WHERE created_by = ? AND created_at > ?'
  ).get(req.user.id, windowStart);

  if (count >= SPAM_LIMIT) {
    banUser(db, req.user.id, `Spam: ${count} comentarii în mai puțin de ${SPAM_WINDOW_MINUTES} minute`, 10);
    const until = new Date(Date.now() + 10 * 86400000).toLocaleDateString('ro-RO');
    return res.status(403).json({
      error: `Contul tău a fost suspendat pentru 10 zile (până pe ${until}): prea multe comentarii într-un timp scurt.`,
      banned: true,
    });
  }

  // Vulgarity check
  const isVulgar = await checkVulgarity(text.trim());
  if (isVulgar) {
    banUser(db, req.user.id, 'Limbaj vulgar sau ofensator detectat', 30);
    const until = new Date(Date.now() + 30 * 86400000).toLocaleDateString('ro-RO');
    return res.status(403).json({
      error: `Contul tău a fost suspendat pentru 30 de zile (până pe ${until}): comentariul conține limbaj vulgar.`,
      banned: true,
    });
  }

  // Analyze sentiment
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
