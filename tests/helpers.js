const bcrypt = require('bcryptjs');
const createDb = require('../db');
const createApp = require('../app');
const { createSession, clearSessions } = require('../middleware/auth');

function createTestEnv() {
  const db = createDb(':memory:');
  const app = createApp(db);

  const editorId = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
    'editor1', bcrypt.hashSync('pass', 10), 'editor'
  ).lastInsertRowid;
  const userId = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
    'user1', bcrypt.hashSync('pass', 10), 'user'
  ).lastInsertRowid;
  const journalistId = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
    'journalist1', bcrypt.hashSync('pass', 10), 'journalist'
  ).lastInsertRowid;

  const editorToken = createSession({ id: editorId, username: 'editor1', role: 'editor' });
  const userToken = createSession({ id: userId, username: 'user1', role: 'user' });

  return { db, app, editorToken, userToken, editorId, userId, journalistId };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

afterEach(() => clearSessions());

module.exports = { createTestEnv, authHeader };
