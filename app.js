const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const { createRouter: paragraphCreateRouter, crudRouter: paragraphCrudRouter } = require('./routes/paragraphs');
const { uploadRouter: imageUploadRouter, deleteRouter: imageDeleteRouter } = require('./routes/images');
const userRoutes = require('./routes/users');

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

  return app;
}

module.exports = createApp;
