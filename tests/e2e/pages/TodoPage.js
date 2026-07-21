class TodoPage {
  constructor(page) {
    this.page = page;
    this.titleInput = page.getByLabel('Title');
    this.descriptionInput = page.getByLabel('Description');
    this.saveTaskButton = page.getByRole('button', { name: 'Save Task' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async addTask({ title, description = '' }) {
    await this.titleInput.fill(title);
    if (description) {
      await this.descriptionInput.fill(description);
    }
    await this.saveTaskButton.click();
  }

  async openDeleteDialog(taskTitle) {
    await this.page.getByLabel(`Delete ${taskTitle}`).click();
  }

  async confirmDelete() {
    await this.page.getByRole('button', { name: 'Delete Task' }).click();
  }
}

module.exports = { TodoPage };
