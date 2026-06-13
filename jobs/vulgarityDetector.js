const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3.2';
const BAN_DAYS = 30;

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
    console.error('[vulgarity-detector] ollama error:', err.message);
    return false;
  }
}

async function runVulgarityDetector(db) {
  const unchecked = db.prepare(`
    SELECT ac.id, ac.text, ac.created_by, u.username, u.banned, u.ban_until
    FROM article_comments ac
    JOIN users u ON u.id = ac.created_by
    WHERE ac.vulgarity_checked = 0
  `).all();

  if (unchecked.length === 0) return;

  console.log(`[vulgarity-detector] checking ${unchecked.length} comment(s)`);

  for (const comment of unchecked) {
    const isVulgar = await checkVulgarity(comment.text);

    db.prepare('UPDATE article_comments SET vulgarity_checked = 1 WHERE id = ?').run(comment.id);

    if (isVulgar) {
      const alreadyBanned = comment.banned && comment.ban_until && new Date(comment.ban_until) > new Date();
      if (!alreadyBanned) {
        db.prepare(
          "UPDATE users SET banned = 1, ban_reason = ?, ban_until = datetime('now', ?) WHERE id = ?"
        ).run('Limbaj vulgar sau ofensator detectat', `+${BAN_DAYS} days`, comment.created_by);
        console.log(`[vulgarity-detector] banned user ${comment.username} for ${BAN_DAYS} days`);
      }
    }
  }
}

function startVulgarityDetector(db, intervalMs = 60000) {
  console.log(`[vulgarity-detector] started, checking every ${intervalMs / 1000}s`);
  setInterval(() => runVulgarityDetector(db), intervalMs);
}

module.exports = { startVulgarityDetector };
