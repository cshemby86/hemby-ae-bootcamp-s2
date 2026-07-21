import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

let todos = [];

const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    const status = req.url.searchParams.get('status') || 'all';
    const search = (req.url.searchParams.get('search') || '').toLowerCase();

    let filtered = [...todos];
    if (status !== 'all') {
      filtered = filtered.filter((todo) => todo.status === status);
    }

    if (search) {
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(search) ||
          (todo.description || '').toLowerCase().includes(search)
      );
    }

    return res(ctx.status(200), ctx.json(filtered));
  }),

  rest.post('/api/todos', (req, res, ctx) => {
    const body = req.body;
    if (!body.title || !body.title.trim()) {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    const created = {
      id: todos.length + 1,
      title: body.title,
      description: body.description || '',
      dueDate: body.dueDate || null,
      priority: body.priority || 'medium',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    todos.unshift(created);
    return res(ctx.status(201), ctx.json(created));
  }),

  rest.patch('/api/todos/:id/toggle', (req, res, ctx) => {
    const id = Number(req.params.id);
    todos = todos.map((todo) =>
      todo.id === id
        ? { ...todo, status: todo.status === 'active' ? 'completed' : 'active' }
        : todo
    );
    const updated = todos.find((todo) => todo.id === id);
    return res(ctx.status(200), ctx.json(updated));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  todos = [];
});
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the header and task form', async () => {
    todos = [
      {
        id: 1,
        title: 'Write tests',
        description: 'Coverage for app',
        dueDate: '2030-01-01',
        priority: 'high',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Task Compass')).toBeInTheDocument();
    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });

  test('loads and displays tasks', async () => {
    todos = [
      {
        id: 1,
        title: 'Test Item 1',
        description: 'First',
        dueDate: null,
        priority: 'low',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        title: 'Test Item 2',
        description: 'Second',
        dueDate: null,
        priority: 'medium',
        status: 'completed',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });

  test('adds a new task', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading tasks')).not.toBeInTheDocument();
    });

    const input = screen.getAllByRole('textbox', { name: /title/i })[0];
    await act(async () => {
      await user.type(input, 'New Test Item');
    });

    const submitButton = screen.getByRole('button', { name: 'Save Task' });
    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('New Test Item')).toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('No tasks found. Add your first task above.')).toBeInTheDocument();
    });
  });

  test('toggles task completion', async () => {
    todos = [
      {
        id: 1,
        title: 'Toggle me',
        description: '',
        dueDate: null,
        priority: 'medium',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Toggle me')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /Mark Toggle me complete/i });
    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });
});