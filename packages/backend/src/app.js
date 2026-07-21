const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);
const ALLOWED_STATUS = new Set(['active', 'completed']);

const defaultStorePath = path.join(__dirname, '..', 'data', 'todos.json');

function isValidDateString(value) {
  return !Number.isNaN(Date.parse(value));
}

function ensureDataDirectory(filePath) {
  if (filePath === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function createMemoryStore(initial = []) {
  let records = [...initial];

  return {
    getAll() {
      return [...records];
    },
    setAll(next) {
      records = [...next];
    },
  };
}

function createFileStore(filePath) {
  ensureDataDirectory(filePath);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
  }

  return {
    getAll() {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    },
    setAll(next) {
      fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
    },
  };
}

function computeDueState(dueDate) {
  if (!dueDate) {
    return 'none';
  }

  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) {
    return 'overdue';
  }
  if (due.getTime() === today.getTime()) {
    return 'today';
  }

  return 'upcoming';
}

function priorityRank(priority) {
  if (priority === 'low') return 1;
  if (priority === 'medium') return 2;
  if (priority === 'high') return 3;
  return 2;
}

function sortTodos(todos, sortBy, order) {
  const asc = order === 'asc' ? 1 : -1;

  const sorted = [...todos].sort((a, b) => {
    if (sortBy === 'priority') {
      return (priorityRank(a.priority) - priorityRank(b.priority)) * asc;
    }

    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) {
        return 0;
      }
      if (!a.dueDate) {
        return 1;
      }
      if (!b.dueDate) {
        return -1;
      }

      return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * asc;
    }

    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * asc;
  });

  return sorted;
}

function createApp(storePath = process.env.DB_PATH || defaultStorePath) {
  const app = express();
  const store = storePath === ':memory:' ? createMemoryStore() : createFileStore(storePath);

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend server is running' });
  });

  app.get('/api/todos', (req, res) => {
    try {
      const status = req.query.status || 'all';
      const dueState = req.query.dueState;
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
      const sortBy = req.query.sortBy || 'createdAt';
      const order = req.query.order || 'desc';

      if (status !== 'all' && !ALLOWED_STATUS.has(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }

      if (dueState && !['overdue', 'today', 'upcoming', 'none'].includes(dueState)) {
        return res.status(400).json({ error: 'Invalid due date filter' });
      }

      if (!['createdAt', 'dueDate', 'priority'].includes(sortBy)) {
        return res.status(400).json({ error: 'Invalid sort field' });
      }

      if (!['asc', 'desc'].includes(order)) {
        return res.status(400).json({ error: 'Invalid sort order' });
      }

      let todos = store.getAll();

      if (status !== 'all') {
        todos = todos.filter((todo) => todo.status === status);
      }

      if (dueState) {
        todos = todos.filter((todo) => computeDueState(todo.dueDate) === dueState);
      }

      if (search) {
        todos = todos.filter(
          (todo) =>
            todo.title.toLowerCase().includes(search) ||
            (todo.description || '').toLowerCase().includes(search)
        );
      }

      res.status(200).json(sortTodos(todos, sortBy, order));
    } catch (error) {
      console.error('Error fetching todos:', error);
      res.status(500).json({ error: 'Failed to fetch todos' });
    }
  });

  app.post('/api/todos', (req, res) => {
    try {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      const dueDate = req.body.dueDate ?? null;
      const priority = req.body.priority || 'medium';
      const status = req.body.status || 'active';

      if (!title) {
        return res.status(400).json({ error: 'Task title is required' });
      }

      if (dueDate !== null && (typeof dueDate !== 'string' || !isValidDateString(dueDate))) {
        return res.status(400).json({ error: 'Due date must be a valid date string' });
      }

      if (!ALLOWED_PRIORITIES.has(priority)) {
        return res.status(400).json({ error: 'Priority must be low, medium, or high' });
      }

      if (!ALLOWED_STATUS.has(status)) {
        return res.status(400).json({ error: 'Status must be active or completed' });
      }

      const todos = store.getAll();
      const nextId = todos.length > 0 ? Math.max(...todos.map((todo) => todo.id)) + 1 : 1;
      const timestamp = nowIso();

      const todo = {
        id: nextId,
        title,
        description,
        dueDate,
        priority,
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      store.setAll([todo, ...todos]);
      res.status(201).json(todo);
    } catch (error) {
      console.error('Error creating todo:', error);
      res.status(500).json({ error: 'Failed to create todo' });
    }
  });

  app.patch('/api/todos/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Valid todo ID is required' });
      }

      const todos = store.getAll();
      const index = todos.findIndex((todo) => todo.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      const current = todos[index];
      const title =
        req.body.title === undefined
          ? current.title
          : typeof req.body.title === 'string'
          ? req.body.title.trim()
          : '';

      if (!title) {
        return res.status(400).json({ error: 'Task title is required' });
      }

      const description =
        req.body.description === undefined
          ? current.description
          : typeof req.body.description === 'string'
          ? req.body.description.trim()
          : '';

      const dueDate =
        req.body.dueDate === undefined
          ? current.dueDate
          : req.body.dueDate === '' || req.body.dueDate === null
          ? null
          : req.body.dueDate;

      if (dueDate !== null && (typeof dueDate !== 'string' || !isValidDateString(dueDate))) {
        return res.status(400).json({ error: 'Due date must be a valid date string' });
      }

      const priority = req.body.priority === undefined ? current.priority : req.body.priority;
      const status = req.body.status === undefined ? current.status : req.body.status;

      if (!ALLOWED_PRIORITIES.has(priority)) {
        return res.status(400).json({ error: 'Priority must be low, medium, or high' });
      }

      if (!ALLOWED_STATUS.has(status)) {
        return res.status(400).json({ error: 'Status must be active or completed' });
      }

      const updated = {
        ...current,
        title,
        description,
        dueDate,
        priority,
        status,
        updatedAt: nowIso(),
      };

      const nextTodos = [...todos];
      nextTodos[index] = updated;
      store.setAll(nextTodos);

      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating todo:', error);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  });

  app.patch('/api/todos/:id/toggle', (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Valid todo ID is required' });
      }

      const todos = store.getAll();
      const index = todos.findIndex((todo) => todo.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      const current = todos[index];
      const updated = {
        ...current,
        status: current.status === 'active' ? 'completed' : 'active',
        updatedAt: nowIso(),
      };

      const nextTodos = [...todos];
      nextTodos[index] = updated;
      store.setAll(nextTodos);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Error toggling todo status:', error);
      res.status(500).json({ error: 'Failed to update todo status' });
    }
  });

  app.delete('/api/todos/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Valid todo ID is required' });
      }

      const todos = store.getAll();
      const nextTodos = todos.filter((todo) => todo.id !== id);
      if (nextTodos.length === todos.length) {
        return res.status(404).json({ error: 'Todo not found' });
      }

      store.setAll(nextTodos);
      res.status(200).json({ message: 'Todo deleted successfully', id });
    } catch (error) {
      console.error('Error deleting todo:', error);
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  });

  return {
    app,
    db: {
      close() {
        return;
      },
    },
  };
}

const { app, db } = createApp();

module.exports = {
  app,
  db,
  createApp,
};