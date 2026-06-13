const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const hardcodedArticles = require('./data/articles');

function setupSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'started'
        CHECK(status IN ('started', 'pending', 'finished')),
      created_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS paragraphs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      paragraph_id INTEGER NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_journalists (
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      journalist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (article_id, journalist_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      paragraph_id INTEGER NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'unresolved'
    );
  `);

  // Migration: add status column to existing DBs that predate it
  try {
    db.exec("ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'unresolved'");
  } catch {}
}

function seedData(db) {
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
      'admin', bcrypt.hashSync('admin', 10), 'admin'
    );
    console.log('Admin user seeded');
  }

  const { c } = db.prepare('SELECT COUNT(*) as c FROM articles').get();
  if (c === 0) {
    const insertArticle = db.prepare(
      'INSERT INTO articles (title, date, status) VALUES (?, ?, ?)'
    );
    const insertParagraph = db.prepare(
      'INSERT INTO paragraphs (text, article_id, order_index) VALUES (?, ?, ?)'
    );
    for (const article of hardcodedArticles) {
      const { lastInsertRowid: articleId } = insertArticle.run(article.title, article.date, 'finished');
      insertParagraph.run(article.summary, articleId, 0);
      article.body.split('\n\n').filter(p => p.trim()).forEach((text, i) => {
        insertParagraph.run(text.trim(), articleId, i + 1);
      });
    }
    console.log(`Seeded ${hardcodedArticles.length} articles`);
  }
}

function createDb(dbPath) {
  const db = new Database(dbPath || path.join(__dirname, 'data', 'app.db'));
  db.pragma('foreign_keys = ON');
  setupSchema(db);
  seedData(db);
  return db;
}

module.exports = createDb;
