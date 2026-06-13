const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const { createRouter: paragraphCreateRouter, crudRouter: paragraphCrudRouter } = require('./routes/paragraphs');
const { uploadRouter: imageUploadRouter, deleteRouter: imageDeleteRouter } = require('./routes/images');
const userRoutes = require('./routes/users');
const { createRouter: commentCreateRouter, commentRouter } = require('./routes/comments');
const reactionRouter = require('./routes/reactions');
const adminRouter = require('./routes/admin');

function createApp(db) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use((req, res, next) => { req.db = db; next(); });

  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/articles/:articleId/paragraphs', paragraphCreateRouter);
  app.use('/api/paragraphs', paragraphCrudRouter);
  app.use('/api/paragraphs/:paragraphId/images', imageUploadRouter);
  app.use('/api/images', imageDeleteRouter);
  app.use('/api/users', userRoutes);
  app.use('/api/paragraphs/:paragraphId/comments', commentCreateRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/articles/:articleId/react', reactionRouter);
  app.use('/api/admin', adminRouter);

  return app;
}

module.exports = createApp;
