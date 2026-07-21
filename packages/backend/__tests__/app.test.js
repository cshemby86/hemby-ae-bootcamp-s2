const request = require('supertest');
const { createApp } = require('../src/app');

let app;
let db;

beforeEach(() => {
  const initialized = createApp(':memory:');
  app = initialized.app;
  db = initialized.db;
});

afterEach(() => {
  if (db) {
    db.close();
  }
});

async function createTodo(overrides = {}) {
  const payload = {
    title: 'Ship backend endpoint tests',
    description: 'Write integration style API coverage',
    dueDate: '2030-01-15',
    priority: 'high',
    ...overrides,
  };

  const response = await request(app)
    .post('/api/todos')
    .send(payload)
    .set('Accept', 'application/json');

  expect(response.status).toBe(201);
  return response.body;
}

describe('TODO API', () => {
  it('creates and lists todos', async () => {
    const created = await createTodo();
    expect(created).toMatchObject({
      title: 'Ship backend endpoint tests',
      status: 'active',
      priority: 'high',
    });

    const response = await request(app).get('/api/todos');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('createdAt');
    expect(response.body[0]).toHaveProperty('updatedAt');
  });

  it('validates required title', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: '   ' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Task title is required');
  });

  it('updates a todo', async () => {
    const created = await createTodo();

    const response = await request(app)
      .patch(`/api/todos/${created.id}`)
      .send({
        title: 'Ship backend tests',
        description: 'Coverage updated',
        priority: 'medium',
        dueDate: null,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: created.id,
      title: 'Ship backend tests',
      description: 'Coverage updated',
      priority: 'medium',
      dueDate: null,
    });
  });

  it('toggles todo completion status', async () => {
    const created = await createTodo();

    const response = await request(app).patch(`/api/todos/${created.id}/toggle`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');

    const second = await request(app).patch(`/api/todos/${created.id}/toggle`);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('active');
  });

  it('deletes an existing todo', async () => {
    const created = await createTodo();

    const response = await request(app).delete(`/api/todos/${created.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Todo deleted successfully', id: created.id });

    const secondDelete = await request(app).delete(`/api/todos/${created.id}`);
    expect(secondDelete.status).toBe(404);
    expect(secondDelete.body.error).toBe('Todo not found');
  });

  it('supports filtering and search', async () => {
    await createTodo({ title: 'Write docs', status: 'completed', priority: 'low', dueDate: null });
    await createTodo({ title: 'Build UI', description: 'material components' });

    const byStatus = await request(app).get('/api/todos?status=completed');
    expect(byStatus.status).toBe(200);
    expect(byStatus.body).toHaveLength(1);
    expect(byStatus.body[0].title).toBe('Write docs');

    const bySearch = await request(app).get('/api/todos?search=material');
    expect(bySearch.status).toBe(200);
    expect(bySearch.body).toHaveLength(1);
    expect(bySearch.body[0].title).toBe('Build UI');

    const withoutDueDate = await request(app).get('/api/todos?dueState=none');
    expect(withoutDueDate.status).toBe(200);
    expect(withoutDueDate.body).toHaveLength(1);
  });
});