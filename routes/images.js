const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

function canEditArticle(db, user, articleId) {
  if (!user) return false;
  if (user.role === 'editor' || user.role === 'admin') return true;
  if (user.role === 'journalist') {
    return !!db.prepare(
      'SELECT 1 FROM article_journalists WHERE article_id = ? AND journalist_id = ?'
    ).get(articleId, user.id);
  }
  return false;
}

// Mounted at /api/paragraphs/:paragraphId/images
const uploadRouter = express.Router({ mergeParams: true });

uploadRouter.post('/', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });

  const db = req.db;
  const para = db.prepare('SELECT id, article_id FROM paragraphs WHERE id = ?').get(req.params.paragraphId);
  if (!para) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Paragraph not found' });
  }

  if (!canEditArticle(db, req.user, para.article_id)) {
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO images (path, paragraph_id) VALUES (?, ?)'
  ).run(req.file.filename, req.params.paragraphId);

  res.status(201).json({ id, path: req.file.filename });
});

// Mounted at /api/images
const deleteRouter = express.Router();

deleteRouter.delete('/:id', requireAuth, (req, res) => {
  const db = req.db;
  const image = db.prepare(`
    SELECT i.id, i.path, p.article_id
    FROM images i JOIN paragraphs p ON p.id = i.paragraph_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!image) return res.status(404).json({ error: 'Not found' });

  if (!canEditArticle(db, req.user, image.article_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);

  const filePath = path.join(uploadDir, image.path);
  if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch {}

  res.json({ success: true });
});

module.exports = { uploadRouter, deleteRouter };
