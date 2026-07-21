import React, { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

let todos = [];
let queries = [];

async function renderApp() {
  await act(async () => {
    render(<App />);
  });
}

const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    queries.push(req.url.searchParams.toString());

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
  }),

  rest.patch('/api/todos/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    const target = todos.find((todo) => todo.id === id);

    if (!target) {
      return res(ctx.status(404), ctx.json({ error: 'Todo not found' }));
    }

    const next = {
      ...target,
      ...req.body,
      dueDate: req.body.dueDate ?? null,
    };

    todos = todos.map((todo) => (todo.id === id ? next : todo));
    return res(ctx.status(200), ctx.json(next));
  }),

  rest.delete('/api/todos/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    todos = todos.filter((todo) => todo.id !== id);
    return res(ctx.status(200), ctx.json({ message: 'Todo deleted successfully', id }));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  todos = [];
  queries = [];
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

    await renderApp();

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

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });

  test('adds a new task', async () => {
    const user = userEvent.setup();

    await renderApp();

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading tasks')).not.toBeInTheDocument();
    });

    const input = screen.getAllByRole('textbox', { name: /title/i })[0];
    act(() => {
      fireEvent.change(input, { target: { value: 'New Test Item' } });
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

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks', async () => {
    await renderApp();

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

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('Toggle me')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /Mark Toggle me complete/i });
    await act(async () => {
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });

    await waitFor(() => {
      expect(screen.getByText('Task status updated')).toBeInTheDocument();
    });
  });

  test('shows validation error when title is empty', async () => {
    const user = userEvent.setup();

    await renderApp();

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading tasks')).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save Task' }));
    });

    expect(screen.getByText('Task title is required.')).toBeInTheDocument();
  });

  test('shows API form error when create fails', async () => {
    const user = userEvent.setup();

    server.use(
      rest.post('/api/todos', (req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: 'Create failed' }))
      )
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading tasks')).not.toBeInTheDocument();
    });

    act(() => {
      fireEvent.change(screen.getAllByRole('textbox', { name: /title/i })[0], {
        target: { value: 'Create error' },
      });
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save Task' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Create failed')).toBeInTheDocument();
    });
  });

  test('updates a task from edit dialog', async () => {
    const user = userEvent.setup();
    todos = [
      {
        id: 10,
        title: 'Original task',
        description: 'Before update',
        dueDate: null,
        priority: 'low',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('Original task')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Edit Original task/i }));
    });

    const dialog = screen.getByRole('dialog', { name: 'Edit Task' });
    const dialogTitleInput = within(dialog).getByRole('textbox', { name: /title/i });

    await act(async () => {
      await user.clear(dialogTitleInput);
    });
    act(() => {
      fireEvent.change(dialogTitleInput, { target: { value: 'Updated task' } });
    });
    await act(async () => {
      await user.click(within(dialog).getByRole('button', { name: 'Save Task' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Updated task')).toBeInTheDocument();
    });

    expect(screen.getByText('Task updated')).toBeInTheDocument();
  });

  test('cancels and confirms delete flow', async () => {
    const user = userEvent.setup();
    todos = [
      {
        id: 21,
        title: 'Delete me',
        description: '',
        dueDate: null,
        priority: 'medium',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('Delete me')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Delete Delete me/i }));
    });
    expect(screen.getByRole('dialog', { name: 'Delete Task' })).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Task' })).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Delete Delete me/i }));
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Delete Task' }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Task deleted')).toBeInTheDocument();
  });

  test('updates filters and includes query params', async () => {
    todos = [
      {
        id: 99,
        title: 'Filter me',
        description: 'matches term',
        dueDate: null,
        priority: 'medium',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('Filter me')).toBeInTheDocument();
    });

    const filterSection = screen.getByText('Find and Organize').closest('.MuiCardContent-root');
    expect(filterSection).not.toBeNull();

    const scoped = within(filterSection);

    act(() => {
      fireEvent.change(scoped.getByRole('textbox', { name: /Search/i }), {
        target: { value: 'term' },
      });
    });

    await waitFor(() => {
      expect(queries.some((query) => query.includes('status=all'))).toBe(true);
      expect(queries.some((query) => query.includes('sortBy=createdAt'))).toBe(true);
      expect(queries.some((query) => query.includes('order=desc'))).toBe(true);
      expect(queries.some((query) => query.includes('search=term'))).toBe(true);
    });
  });

  test('closes snackbar via close button', async () => {
    jest.useFakeTimers();
    userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await renderApp();

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading tasks')).not.toBeInTheDocument();
    });

    const titleInput = screen.getAllByRole('textbox', { name: /title/i })[0];
    const saveButton = screen.getByRole('button', { name: 'Save Task' });
    const form = saveButton.closest('form');

    expect(form).not.toBeNull();

    act(() => {
      fireEvent.change(titleInput, { target: { value: 'Snackbar task' } });
    });

    act(() => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Task saved')).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(3200);
    });

    await waitFor(() => {
      expect(screen.queryByText('Task saved')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});