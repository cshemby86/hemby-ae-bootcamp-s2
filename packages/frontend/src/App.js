import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import './App.css';

const paletteTheme = createTheme({
  palette: {
    primary: { main: '#1565C0' },
    secondary: { main: '#2E7D32' },
    background: { default: '#F7F9FC', paper: '#FFFFFF' },
    error: { main: '#C62828' },
    text: { primary: '#1F2937', secondary: '#6B7280' },
  },
  spacing: 8,
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

const initialForm = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
};

function formatDate(dateValue) {
  if (!dateValue) {
    return 'No due date';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'No due date';
  }

  return parsed.toLocaleDateString();
}

function getDueStateChip(todo) {
  if (!todo.dueDate) {
    return <Chip size="small" label="No due date" variant="outlined" />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) {
    return <Chip size="small" color="error" label="Overdue" />;
  }

  if (due.getTime() === today.getTime()) {
    return <Chip size="small" color="secondary" label="Due today" />;
  }

  return <Chip size="small" color="primary" label="Upcoming" variant="outlined" />;
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  params.set('sortBy', filters.sortBy);
  params.set('order', filters.order);
  params.set('status', filters.status);

  if (filters.dueState !== 'all') {
    params.set('dueState', filters.dueState);
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return params.toString();
}

async function parseResponse(response) {
  if (response.ok) {
    return response.json();
  }

  let message = 'Unexpected error';
  try {
    const payload = await response.json();
    message = payload.error || message;
  } catch (err) {
    message = response.statusText || message;
  }

  throw new Error(message);
}

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [editingTodo, setEditingTodo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filters, setFilters] = useState({
    status: 'all',
    dueState: 'all',
    sortBy: 'createdAt',
    order: 'desc',
    search: '',
  });

  const queryString = useMemo(() => buildQuery(filters), [filters]);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/todos?${queryString}`);
      const result = await parseResponse(response);
      setTodos(result);
      setError('');
    } catch (err) {
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const updateFormValue = (field) => (event) => {
    setFormValues((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleCreateTodo = async (event) => {
    event.preventDefault();

    if (!formValues.title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    try {
      const payload = {
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        dueDate: formValues.dueDate || null,
        priority: formValues.priority,
      };

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const created = await parseResponse(response);
      setTodos((previous) => [created, ...previous]);
      setFormValues(initialForm);
      setFormError('');
      setSnackbar({ open: true, message: 'Task saved', severity: 'success' });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleToggle = async (todoId) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/toggle`, { method: 'PATCH' });
      const updated = await parseResponse(response);
      setTodos((previous) => previous.map((item) => (item.id === todoId ? updated : item)));
      setSnackbar({ open: true, message: 'Task status updated', severity: 'success' });
    } catch (err) {
      setError(`Failed to update task: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTodo || !editingTodo.title.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTodo.title.trim(),
          description: editingTodo.description.trim(),
          dueDate: editingTodo.dueDate || null,
          priority: editingTodo.priority,
          status: editingTodo.status,
        }),
      });

      const updated = await parseResponse(response);
      setTodos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setEditingTodo(null);
      setSnackbar({ open: true, message: 'Task updated', severity: 'success' });
    } catch (err) {
      setError(`Failed to update task: ${err.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      const response = await fetch(`/api/todos/${deleteTarget.id}`, { method: 'DELETE' });
      await parseResponse(response);
      setTodos((previous) => previous.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSnackbar({ open: true, message: 'Task deleted', severity: 'success' });
    } catch (err) {
      setError(`Failed to delete task: ${err.message}`);
    }
  };

  const closeSnackbar = () => setSnackbar((previous) => ({ ...previous, open: false }));

  return (
    <ThemeProvider theme={paletteTheme}>
      <CssBaseline />
      <div className="app-shell">
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
              Task Compass
            </Typography>
            <Typography variant="body2">Plan, focus, finish</Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Add Task
                </Typography>
                <Box component="form" onSubmit={handleCreateTodo} className="task-form">
                  <TextField
                    label="Title"
                    value={formValues.title}
                    onChange={updateFormValue('title')}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Description"
                    value={formValues.description}
                    onChange={updateFormValue('description')}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <TextField
                    label="Due Date"
                    type="date"
                    value={formValues.dueDate}
                    onChange={updateFormValue('dueDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                  <FormControl>
                    <InputLabel id="priority-create-label">Priority</InputLabel>
                    <Select
                      labelId="priority-create-label"
                      label="Priority"
                      value={formValues.priority}
                      onChange={updateFormValue('priority')}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                  <Button type="submit" variant="contained">
                    Save Task
                  </Button>
                </Box>
                {formError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {formError}
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Find and Organize
                </Typography>
                <div className="filter-grid">
                  <TextField
                    label="Search"
                    value={filters.search}
                    onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                    placeholder="Search title or description"
                  />

                  <FormControl>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      label="Status"
                      value={filters.status}
                      onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <InputLabel id="due-filter-label">Due Date</InputLabel>
                    <Select
                      labelId="due-filter-label"
                      label="Due Date"
                      value={filters.dueState}
                      onChange={(event) => setFilters((prev) => ({ ...prev, dueState: event.target.value }))}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                      <MenuItem value="today">Due Today</MenuItem>
                      <MenuItem value="upcoming">Upcoming</MenuItem>
                      <MenuItem value="none">No Due Date</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <InputLabel id="sort-by-label">Sort By</InputLabel>
                    <Select
                      labelId="sort-by-label"
                      label="Sort By"
                      value={filters.sortBy}
                      onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value }))}
                    >
                      <MenuItem value="createdAt">Created</MenuItem>
                      <MenuItem value="dueDate">Due Date</MenuItem>
                      <MenuItem value="priority">Priority</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <InputLabel id="sort-order-label">Order</InputLabel>
                    <Select
                      labelId="sort-order-label"
                      label="Order"
                      value={filters.order}
                      onChange={(event) => setFilters((prev) => ({ ...prev, order: event.target.value }))}
                    >
                      <MenuItem value="asc">Ascending</MenuItem>
                      <MenuItem value="desc">Descending</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tasks
                </Typography>

                {loading && (
                  <Box className="loading-wrapper">
                    <CircularProgress aria-label="Loading tasks" />
                  </Box>
                )}

                {!loading && error && <Alert severity="error">{error}</Alert>}

                {!loading && !error && todos.length === 0 && (
                  <Alert severity="info">No tasks found. Add your first task above.</Alert>
                )}

                {!loading && !error && todos.length > 0 && (
                  <List>
                    {todos.map((todo) => (
                      <ListItem key={todo.id} divider alignItems="flex-start" className="todo-item">
                        <Checkbox
                          checked={todo.status === 'completed'}
                          onChange={() => handleToggle(todo.id)}
                          disableRipple
                          inputProps={{ 'aria-label': `Mark ${todo.title} complete` }}
                        />
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle1"
                              sx={{ textDecoration: todo.status === 'completed' ? 'line-through' : 'none' }}
                            >
                              {todo.title}
                            </Typography>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                          secondary={
                            <Stack spacing={1} sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {todo.description || 'No description'}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                <Chip
                                  size="small"
                                  label={`Priority: ${todo.priority}`}
                                  color={todo.priority === 'high' ? 'error' : todo.priority === 'medium' ? 'secondary' : 'default'}
                                />
                                <Chip size="small" label={`Due: ${formatDate(todo.dueDate)}`} variant="outlined" />
                                {getDueStateChip(todo)}
                              </Stack>
                            </Stack>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            disableRipple
                            aria-label={`Edit ${todo.title}`}
                            onClick={() => setEditingTodo({ ...todo, dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : '' })}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="error"
                            disableRipple
                            aria-label={`Delete ${todo.title}`}
                            onClick={() => setDeleteTarget(todo)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Container>

        <Dialog open={Boolean(editingTodo)} onClose={() => setEditingTodo(null)} fullWidth maxWidth="sm">
          <DialogTitle>Edit Task</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Title"
                value={editingTodo?.title || ''}
                onChange={(event) =>
                  setEditingTodo((previous) => ({ ...previous, title: event.target.value }))
                }
                required
              />
              <TextField
                label="Description"
                multiline
                minRows={2}
                value={editingTodo?.description || ''}
                onChange={(event) =>
                  setEditingTodo((previous) => ({ ...previous, description: event.target.value }))
                }
              />
              <TextField
                label="Due Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editingTodo?.dueDate || ''}
                onChange={(event) =>
                  setEditingTodo((previous) => ({ ...previous, dueDate: event.target.value }))
                }
              />
              <FormControl>
                <InputLabel id="priority-edit-label">Priority</InputLabel>
                <Select
                  labelId="priority-edit-label"
                  label="Priority"
                  value={editingTodo?.priority || 'medium'}
                  onChange={(event) =>
                    setEditingTodo((previous) => ({ ...previous, priority: event.target.value }))
                  }
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingTodo(null)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit}>
              Save Task
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to permanently delete "{deleteTarget?.title}"?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={confirmDelete}>
              Delete Task
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}

export default App;