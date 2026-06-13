const crypto = require('crypto');

const sessions = new Map();

function createSession(user) {
  const token = crypto.randomUUID();
  sessions.set(token, { id: user.id, username: user.username, role: user.role });
  return token;
}

function clearSessions() {
  sessions.clear();
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = sessions.get(auth.slice(7));
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { createSession, clearSessions, requireAuth, requireRole };
