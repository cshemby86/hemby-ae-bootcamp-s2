const { test, expect } = require('@playwright/test');
const { TodoPage } = require('./pages/TodoPage');

test.describe('todo workflow', () => {
  let todoPage;

  test.beforeEach(async ({ page }) => {
    todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  test('user can add and delete a task', async ({ page }) => {
    const taskTitle = `E2E task ${Date.now()}`;

    await todoPage.addTask({
      title: taskTitle,
      description: 'Created from Playwright test',
    });

    await expect(page.getByText(taskTitle)).toBeVisible();

    await todoPage.openDeleteDialog(taskTitle);
    await todoPage.confirmDelete();

    await expect(page.getByText(taskTitle)).toHaveCount(0);
  });
});
