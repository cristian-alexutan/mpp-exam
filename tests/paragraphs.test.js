const request = require('supertest');
const { createTestEnv, authHeader } = require('./helpers');

describe('Paragraph endpoints', () => {
  let app, editorToken, userToken, articleId;

  beforeEach(async () => {
    ({ app, editorToken, userToken } = createTestEnv());
    const res = await request(app).post('/api/articles')
      .set(authHeader(editorToken))
      .send({ title: 'Para Test', date: '1 Iunie 2026' });
    articleId = res.body.id;
  });

  describe('POST /api/articles/:id/paragraphs', () => {
    test('editor can add a paragraph', async () => {
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken))
        .send({ text: 'First paragraph text.' });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe('First paragraph text.');
      expect(res.body.order_index).toBe(0);
      expect(res.body.images).toEqual([]);
    });

    test('second paragraph gets order_index 1', async () => {
      await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken)).send({ text: 'First' });
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken)).send({ text: 'Second' });
      expect(res.body.order_index).toBe(1);
    });

    test('rejects empty text', async () => {
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken))
        .send({ text: '   ' });
      expect(res.status).toBe(400);
    });

    test('rejects missing text', async () => {
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken)).send({});
      expect(res.status).toBe(400);
    });

    test('user cannot add paragraphs', async () => {
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(userToken))
        .send({ text: 'text' });
      expect(res.status).toBe(403);
    });

    test('returns 404 for nonexistent article', async () => {
      const res = await request(app).post('/api/articles/99999/paragraphs')
        .set(authHeader(editorToken))
        .send({ text: 'text' });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/paragraphs/:id', () => {
    let paragraphId;
    beforeEach(async () => {
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken)).send({ text: 'Original text' });
      paragraphId = res.body.id;
    });

    test('editor can update paragraph text', async () => {
      const res = await request(app).put(`/api/paragraphs/${paragraphId}`)
        .set(authHeader(editorToken))
        .send({ text: 'Updated text' });
      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Updated text');
    });

    test('rejects empty text', async () => {
      const res = await request(app).put(`/api/paragraphs/${paragraphId}`)
        .set(authHeader(editorToken))
        .send({ text: '' });
      expect(res.status).toBe(400);
    });

    test('returns 404 for nonexistent paragraph', async () => {
      const res = await request(app).put('/api/paragraphs/99999')
        .set(authHeader(editorToken))
        .send({ text: 'text' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/paragraphs/:id', () => {
    let paragraphId;
    beforeEach(async () => {
      const res = await request(app).post(`/api/articles/${articleId}/paragraphs`)
        .set(authHeader(editorToken)).send({ text: 'To delete' });
      paragraphId = res.body.id;
    });

    test('editor can delete a paragraph', async () => {
      const res = await request(app).delete(`/api/paragraphs/${paragraphId}`)
        .set(authHeader(editorToken));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 404 for already deleted paragraph', async () => {
      await request(app).delete(`/api/paragraphs/${paragraphId}`).set(authHeader(editorToken));
      const res = await request(app).delete(`/api/paragraphs/${paragraphId}`).set(authHeader(editorToken));
      expect(res.status).toBe(404);
    });

    test('user cannot delete paragraphs', async () => {
      const res = await request(app).delete(`/api/paragraphs/${paragraphId}`)
        .set(authHeader(userToken));
      expect(res.status).toBe(403);
    });
  });
});
