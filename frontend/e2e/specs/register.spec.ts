import { test, expect } from '@playwright/test';

test('register healthcare business and land on dashboard', async ({ page }) => {
  test.skip(!process.env.E2E, 'Set E2E=true with running web and API');
  const suffix = Date.now();
  await page.goto('/register');
  await page.getByLabel('First name').fill('Neha');
  await page.getByLabel('Last name').fill('Sharma');
  await page.getByLabel('Email').fill(`neha.${suffix}@nehadental.example`);
  await page.getByLabel('Password').fill('Str0ngPass!word');
  await page.getByLabel('Type of business').selectOption({ label: 'Healthcare' });
  await page.getByLabel('Name of business').fill('Neha Dental Clinic');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Neha Dental Clinic')).toBeVisible();
});
