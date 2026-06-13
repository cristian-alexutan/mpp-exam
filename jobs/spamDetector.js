const SPAM_LIMIT = 4;
const SPAM_WINDOW_MINUTES = 4;
const BAN_DAYS = 10;

function runSpamDetector(db) {
  const spammers = db.prepare(`
    SELECT created_by, COUNT(*) as count
    FROM article_comments
    WHERE created_at > datetime('now', '-${SPAM_WINDOW_MINUTES} minutes')
    GROUP BY created_by
    HAVING COUNT(*) >= ${SPAM_LIMIT}
  `).all();

  for (const row of spammers) {
    const user = db.prepare('SELECT id, username, banned, ban_until FROM users WHERE id = ?').get(row.created_by);
    if (!user) continue;

    // Skip if already under an active ban
    if (user.banned && user.ban_until && new Date(user.ban_until) > new Date()) continue;

    db.prepare(
      "UPDATE users SET banned = 1, ban_reason = ?, ban_until = datetime('now', ?) WHERE id = ?"
    ).run(
      `Spam: ${row.count} comentarii în mai puțin de ${SPAM_WINDOW_MINUTES} minute`,
      `+${BAN_DAYS} days`,
      user.id
    );

    console.log(`[spam-detector] banned user ${user.username} (${row.count} comments in ${SPAM_WINDOW_MINUTES} min) for ${BAN_DAYS} days`);
  }
}

function startSpamDetector(db, intervalMs = 60000) {
  console.log(`[spam-detector] started, checking every ${intervalMs / 1000}s`);
  setInterval(() => runSpamDetector(db), intervalMs);
}

module.exports = { startSpamDetector };
