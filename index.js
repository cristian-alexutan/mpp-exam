const http = require('http');
const createDb = require('./db');
const createApp = require('./app');
const { startSpamDetector } = require('./jobs/spamDetector');
const { startVulgarityDetector } = require('./jobs/vulgarityDetector');

const PORT = process.env.PORT || 3001;
const db = createDb();
const app = createApp(db);

startSpamDetector(db, 60000);
startVulgarityDetector(db, 60000);

http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
