const request = require('supertest');
const { createTestEnv, authHeader } = require('./helpers');

describe('Comment endpoints', () => {
  let app, editorToken, userToken, articleId, paragraphId;

  beforeEach(async () => {
    ({ app, editorToken, userToken } = createTestEnv());
    const artRes = await request(app).post('/api/articles')
      .set(authHeader(editorToken)).send({ title: 'Comment Test', date: '1 Iunie 2026' });
    articleId = artRes.body.id;
    const paraRes = await request(app).post(`/api/articles/${articleId}/paragraphs`)
      .set(authHeader(editorToken)).send({ text: 'A paragraph.' });
    paragraphId = paraRes.body.id;
  });

  describe('POST /api/paragraphs/:id/comments', () => {
    test('editor can add a comment', async () => {
      const res = await request(app).post(`/api/paragraphs/${paragraphId}/comments`)
        .set(authHeader(editorToken)).send({ text: 'Needs fact-checking.' });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Needs fact-checking.');
      expect(res.body.author).toBe('editor1');
      expect(res.body.created_at).toBeDefined();
    });

    test('rejects empty comment text', async () => {
      const res = await request(app).post(`/api/paragraphs/${paragraphId}/comments`)
        .set(authHeader(editorToken)).send({ text: '   ' });
      expect(res.status).toBe(400);
    });

    test('user cannot add comments', async () => {
      const res = await request(app).post(`/api/paragraphs/${paragraphId}/comments`)
        .set(authHeader(userToken)).send({ text: 'hi' });
      expect(res.status).toBe(403);
    });

    test('unauthenticated request is rejected', async () => {
      const res = await request(app).post(`/api/paragraphs/${paragraphId}/comments`)
        .send({ text: 'hi' });
      expect(res.status).toBe(401);
    });

    test('returns 404 for nonexistent paragraph', async () => {
      const res = await request(app).post('/api/paragraphs/99999/comments')
        .set(authHeader(editorToken)).send({ text: 'hi' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/articles/:id includes comments for editors', () => {
    test('editor sees comments in paragraph data', async () => {
      await request(app).post(`/api/paragraphs/${paragraphId}/comments`)
        .set(authHeader(editorToken)).send({ text: 'Review this.' });

      // Set article to finished so it is accessible
      await request(app).patch(`/api/articles/${articleId}/status`)
        .set(authHeader(editorToken)).send({ status: 'finished' });

      const res = await request(app).get(`/api/articles/${articleId}`)
        .set(authHeader(editorToken));
      expect(res.status).toBe(200);
      const para = res.body.paragraphs.find(p => p.id === paragraphId);
      expect(para.comments).toBeDefined();
      expect(para.comments.length).toBe(1);
      expect(para.comments[0].text).toBe('Review this.');
    });

    test('public request does not include comments', async () => {
      await request(app).patch(`/api/articles/${articleId}/status`)
        .set(authHeader(editorToken)).send({ status: 'finished' });

      const res = await request(app).get(`/api/articles/${articleId}`);
      expect(res.status).toBe(200);
      expect(res.body.paragraphs[0].comments).toBeUndefined();
    });
  });

  describe('DELETE /api/comments/:id', () => {
    test('editor can delete a comment', async () => {
      const addRes = await request(app).post(`/api/paragraphs/${paragraphId}/comments`)
        .set(authHeader(editorToken)).send({ text: 'To delete.' });
      const commentId = addRes.body.id;

      const res = await request(app).delete(`/api/comments/${commentId}`)
        .set(authHeader(editorToken));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 404 for nonexistent comment', async () => {
      const res = await request(app).delete('/api/comments/99999')
        .set(authHeader(editorToken));
      expect(res.status).toBe(404);
    });
  });
});
