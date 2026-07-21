const request = require('supertest');
const { createApp } = require('../../src/app');

describe('TODO API integration', () => {
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

  it('runs a create -> update -> delete lifecycle with real HTTP requests', async () => {
    const createResponse = await request(app)
      .post('/api/todos')
      .send({
        title: 'End-to-end API lifecycle',
        description: 'Created in integration test',
        dueDate: '2031-02-20',
        priority: 'medium',
      });

    expect(createResponse.status).toBe(201);
    const todoId = createResponse.body.id;

    const updateResponse = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'Updated lifecycle task', priority: 'high' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.title).toBe('Updated lifecycle task');
    expect(updateResponse.body.priority).toBe('high');

    const toggleResponse = await request(app).patch(`/api/todos/${todoId}/toggle`);
    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body.status).toBe('completed');

    const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);
    expect(deleteResponse.status).toBe(200);

    const listResponse = await request(app).get('/api/todos');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(0);
  });
});
