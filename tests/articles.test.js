const request = require('supertest');
const { createTestEnv, authHeader } = require('./helpers');

describe('GET /api/articles', () => {
  let app, editorToken, userToken;
  beforeEach(() => ({ app, editorToken, userToken } = createTestEnv()));

  test('public sees only finished articles', async () => {
    const res = await request(app).get('/api/articles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every(a => a.status === 'finished')).toBe(true);
  });

  test('public list is non-empty (seeded finished articles exist)', async () => {
    const res = await request(app).get('/api/articles');
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('editor sees all articles including non-finished', async () => {
    // Create a started article
    await request(app).post('/api/articles')
      .set(authHeader(editorToken)).send({ title: 'Draft', date: '1 Iunie 2026' });

    const editorRes = await request(app).get('/api/articles').set(authHeader(editorToken));
    const publicRes = await request(app).get('/api/articles');

    expect(editorRes.body.length).toBeGreaterThan(publicRes.body.length);
    expect(editorRes.body.some(a => a.status === 'started')).toBe(true);
  });

  test('logged-in regular user sees only finished articles', async () => {
    await request(app).post('/api/articles')
      .set(authHeader(editorToken)).send({ title: 'Draft', date: '1 Iunie 2026' });

    const res = await request(app).get('/api/articles').set(authHeader(userToken));
    expect(res.body.every(a => a.status === 'finished')).toBe(true);
  });
});

describe('GET /api/articles/:id', () => {
  let app, editorToken, userToken;
  beforeEach(() => ({ app, editorToken, userToken } = createTestEnv()));

  test('returns finished article with paragraphs and journalists', async () => {
    const list = await request(app).get('/api/articles');
    const id = list.body[0].id;
    const res = await request(app).get(`/api/articles/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('paragraphs');
    expect(res.body).toHaveProperty('journalists');
    expect(Array.isArray(res.body.paragraphs)).toBe(true);
  });

  test('public cannot access non-finished article', async () => {
    const artRes = await request(app).post('/api/articles')
      .set(authHeader(editorToken)).send({ title: 'Draft', date: '1 Iunie 2026' });
    const id = artRes.body.id;
    const res = await request(app).get(`/api/articles/${id}`);
    expect(res.status).toBe(404);
  });

  test('editor can access non-finished article', async () => {
    const artRes = await request(app).post('/api/articles')
      .set(authHeader(editorToken)).send({ title: 'Draft', date: '1 Iunie 2026' });
    const res = await request(app).get(`/api/articles/${artRes.body.id}`)
      .set(authHeader(editorToken));
    expect(res.status).toBe(200);
  });

  test('returns 404 for nonexistent article', async () => {
    const res = await request(app).get('/api/articles/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/articles', () => {
  let app, editorToken, userToken;
  beforeEach(() => ({ app, editorToken, userToken } = createTestEnv()));

  test('editor can create an article', async () => {
    const res = await request(app).post('/api/articles')
      .set(authHeader(editorToken))
      .send({ title: 'Test Article', date: '1 Iunie 2026' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Article');
    expect(res.body.status).toBe('started');
    expect(res.body.paragraphs).toEqual([]);
  });

  test('regular user cannot create an article', async () => {
    const res = await request(app).post('/api/articles')
      .set(authHeader(userToken))
      .send({ title: 'Test', date: '1 Iunie 2026' });
    expect(res.status).toBe(403);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await request(app).post('/api/articles')
      .send({ title: 'Test', date: '1 Iunie 2026' });
    expect(res.status).toBe(401);
  });

  test('rejects empty title', async () => {
    const res = await request(app).post('/api/articles')
      .set(authHeader(editorToken))
      .send({ title: '   ', date: '1 Iunie 2026' });
    expect(res.status).toBe(400);
  });


  test('rejects title over 200 characters', async () => {
    const res = await request(app).post('/api/articles')
      .set(authHeader(editorToken))
      .send({ title: 'a'.repeat(201), date: '1 Iunie 2026' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/articles/:id/status', () => {
  let app, editorToken, userToken, articleId;
  beforeEach(async () => {
    ({ app, editorToken, userToken } = createTestEnv());
    const res = await request(app).post('/api/articles')
      .set(authHeader(editorToken))
      .send({ title: 'Status Test', date: '1 Iunie 2026' });
    articleId = res.body.id;
  });

  test('editor can update status', async () => {
    const res = await request(app).patch(`/api/articles/${articleId}/status`)
      .set(authHeader(editorToken))
      .send({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  test('rejects invalid status', async () => {
    const res = await request(app).patch(`/api/articles/${articleId}/status`)
      .set(authHeader(editorToken))
      .send({ status: 'published' });
    expect(res.status).toBe(400);
  });

  test('user cannot change status', async () => {
    const res = await request(app).patch(`/api/articles/${articleId}/status`)
      .set(authHeader(userToken))
      .send({ status: 'finished' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/articles/:id/journalists', () => {
  let app, editorToken, journalistId, articleId;
  beforeEach(async () => {
    ({ app, editorToken, journalistId } = createTestEnv());
    const res = await request(app).post('/api/articles')
      .set(authHeader(editorToken))
      .send({ title: 'Journalist Test', date: '1 Iunie 2026' });
    articleId = res.body.id;
  });

  test('editor can assign journalists', async () => {
    const res = await request(app).put(`/api/articles/${articleId}/journalists`)
      .set(authHeader(editorToken))
      .send({ journalistIds: [journalistId] });
    expect(res.status).toBe(200);
    expect(res.body.journalistIds).toContain(journalistId);
  });

  test('rejects assigning a non-journalist user', async () => {
    const { userId } = createTestEnv();
    const res = await request(app).put(`/api/articles/${articleId}/journalists`)
      .set(authHeader(editorToken))
      .send({ journalistIds: [userId] });
    expect(res.status).toBe(400);
  });

  test('rejects non-array journalistIds', async () => {
    const res = await request(app).put(`/api/articles/${articleId}/journalists`)
      .set(authHeader(editorToken))
      .send({ journalistIds: 'wrong' });
    expect(res.status).toBe(400);
  });
});
