import { test, expect } from '@playwright/test';

test.describe('Tasks CRUD', () => {
  test('creates a new task', async ({ page }) => {
    await page.goto('/tasks/new');

    await page.getByPlaceholder('e.g. Data Extraction').fill('E2E Test Task');
    await page.getByPlaceholder('What does this task do?').fill('Created by Playwright');

    await page.getByRole('button', { name: 'Create Task' }).click();

    // Should navigate to task detail
    await expect(page.getByText('E2E Test Task')).toBeVisible();
  });

  test('lists tasks on the tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Task' })).toBeVisible();
  });

  test('navigates from tasks page to new task form', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'New Task' }).click();
    await expect(page).toHaveURL('/tasks/new');
    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible();
  });
});
