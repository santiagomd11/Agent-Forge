import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('loads the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Recent Projects')).toBeVisible();
    await expect(page.getByText('Recent Tasks')).toBeVisible();
  });

  test('navigates to Tasks page via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page).toHaveURL('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  });

  test('navigates to Projects page via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  test('navigates to Runs page via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Runs' }).click();
    await expect(page).toHaveURL('/runs');
    await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();
  });

  test('navigates to Settings page via sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
