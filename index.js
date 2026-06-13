const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const articles = require('./data/articles');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Articles
app.get('/api/articles', (req, res) => {
  const list = articles.map(({ id, title, date, summary }) => ({ id, title, date, summary }));
  res.json(list);
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json(article);
});

// Auth
app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'All fields required' });
  if (role === 'admin') return res.status(403).json({ error: 'Cannot register as admin' });
  if (!['user', 'journalist', 'editor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, role);
    res.json({ id: result.lastInsertRowid, username, role });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
