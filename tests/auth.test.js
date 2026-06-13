const request = require('supertest');
const { createTestEnv } = require('./helpers');

describe('POST /api/auth/register', () => {
  let app;
  beforeEach(() => ({ app } = createTestEnv()));

  test('registers a new user and returns token', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'newuser', password: 'pass1', role: 'user' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('newuser');
    expect(res.body.role).toBe('user');
    expect(res.body.token).toBeDefined();
  });

  test('rejects admin role', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'x', password: 'pass1', role: 'admin' });
    expect(res.status).toBe(403);
  });

  test('rejects invalid role', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'x', password: 'pass1', role: 'superuser' });
    expect(res.status).toBe(400);
  });

  test('rejects duplicate username', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'admin', password: 'whatever', role: 'user' });
    expect(res.status).toBe(409);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'x' });
    expect(res.status).toBe(400);
  });

  test('rejects username shorter than 3 chars', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'ab', password: 'pass1', role: 'user' });
    expect(res.status).toBe(400);
  });

  test('rejects password shorter than 4 chars', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'validname', password: 'abc', role: 'user' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  let app;
  beforeEach(() => ({ app } = createTestEnv()));

  test('logs in with correct credentials and returns token', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
    expect(res.body.role).toBe('admin');
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('rejects nonexistent user', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'nobody', password: 'pass' });
    expect(res.status).toBe(401);
  });

  test('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
  });
});
