const express = require('express');
const cors = require('cors');
const articles = require('./data/articles');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/articles', (req, res) => {
  const list = articles.map(({ id, title, date, summary }) => ({ id, title, date, summary }));
  res.json(list);
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === Number(req.params.id));
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json(article);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
