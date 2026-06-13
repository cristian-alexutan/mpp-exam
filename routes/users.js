const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/journalists', requireAuth, requireRole('editor', 'admin'), (req, res) => {
  const journalists = req.db.prepare(
    "SELECT id, username FROM users WHERE role = 'journalist' ORDER BY username"
  ).all();
  res.json(journalists);
});

module.exports = router;
