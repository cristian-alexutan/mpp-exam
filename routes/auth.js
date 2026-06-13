const express = require('express');
const bcrypt = require('bcryptjs');
const { createSession } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields required' });

  const user = req.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createSession(user);
  res.json({ id: user.id, username: user.username, role: user.role, token });
});

router.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'All fields required' });
  if (role === 'admin') return res.status(403).json({ error: 'Cannot register as admin' });
  if (!['user', 'journalist', 'editor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 50) {
    return res.status(400).json({ error: 'Username must be 3-50 characters' });
  }
  if (typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const { lastInsertRowid: id } = req.db.prepare(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
    ).run(username.trim(), hash, role);
    const token = createSession({ id, username: username.trim(), role });
    res.status(201).json({ id, username: username.trim(), role, token });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
