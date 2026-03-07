import { test, expect } from '@playwright/test';

test.describe('Projects CRUD', () => {
  test('creates a new project and opens canvas', async ({ page }) => {
    await page.goto('/projects/new');

    await page.getByPlaceholder('e.g. Customer Support Pipeline').fill('E2E Pipeline');
    await page.getByPlaceholder('What does this project do?').fill('Playwright test project');

    await page.getByRole('button', { name: 'Create Project' }).click();

    // Should navigate to canvas
    await expect(page.getByText('E2E Pipeline')).toBeVisible();
    await expect(page.getByText('Add Task')).toBeVisible();
    await expect(page.getByText('Run')).toBeVisible();
  });

  test('lists projects on the projects page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.getByText('New Project')).toBeVisible();
  });

  test('navigates to project canvas from project list', async ({ page }) => {
    await page.goto('/projects');

    // Wait for projects to load, click on the first one
    const projectLink = page.locator('text=E2E Pipeline').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await expect(page.getByText('Add Task')).toBeVisible();
    }
  });
});
