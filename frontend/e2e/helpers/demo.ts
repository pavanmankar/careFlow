import { expect, type Page } from '@playwright/test';
import { E2E_DEMO } from '../../src/lib/demo';

export const DEMO = E2E_DEMO;

export async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

export async function waitForPortal(page: Page) {
  await page.waitForLoadState('networkidle');
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await waitForPortal(page);
  await page.getByLabel('Email or Username').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 });
  await waitForPortal(page);
}

export async function loginAsClinicOwner(page: Page) {
  await login(page, DEMO.clinicOwner.email, DEMO.clinicOwner.password);
}

export async function loginAsSuperAdmin(page: Page) {
  await login(page, DEMO.superAdmin.email, DEMO.superAdmin.password);
}

export async function logout(page: Page, userName?: string) {
  const menuButton = userName
    ? page.getByRole('button', { name: new RegExp(userName, 'i') })
    : page.locator('header button[aria-haspopup="menu"]');
  await menuButton.click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: /Welcome Back to CareFlow/i })).toBeVisible({ timeout: 30_000 });
  await waitForPortal(page);
}

export async function goToNav(page: Page, label: string) {
  await page.getByRole('link', { name: label, exact: true }).click();
  await waitForPortal(page);
}

export async function expandUserManagement(page: Page) {
  const toggle = page.getByRole('button', { name: /User Management/i });
  const staffLink = page.getByRole('link', { name: 'Staff' });
  if (!(await staffLink.isVisible())) {
    await toggle.click();
  }
  await expect(staffLink).toBeVisible();
}
