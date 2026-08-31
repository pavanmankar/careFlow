import { test, expect } from '@playwright/test';
import {
  DEMO,
  expandUserManagement,
  goToNav,
  loginAsClinicOwner,
  loginAsSuperAdmin,
  logout,
  pause,
  waitForPortal,
} from '../helpers/demo';

test.describe.configure({ mode: 'serial' });

test('CareFlow stakeholder demo walkthrough', async ({ page }) => {
  // Scene 1 — Login intro
  await page.goto('/login');
  await waitForPortal(page);
  await expect(page.getByRole('heading', { name: /Welcome Back to CareFlow/i })).toBeVisible();
  await pause(page, DEMO.pause.intro);

  // Scene 2 — Clinic owner dashboard
  await loginAsClinicOwner(page);
  await expect(page.getByText(/Hello Anita/i)).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.dashboard);

  // Scene 3 — Patients
  await goToNav(page, 'Patients');
  await expect(page.getByPlaceholder('Search patient')).toBeVisible();
  const firstPatient = page.locator('tbody tr').first();
  await expect(firstPatient).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.scene);
  await firstPatient.getByRole('link').first().click();
  await waitForPortal(page);
  await pause(page, DEMO.pause.scene);

  // Scene 4 — Appointments and visit chart
  await goToNav(page, 'Appointments');
  await expect(page.getByPlaceholder('Search patient').first()).toBeVisible();
  const firstAppointment = page.locator('tbody tr').first();
  await expect(firstAppointment).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.scene);
  await firstAppointment.getByRole('link', { name: 'View visit' }).click();
  await waitForPortal(page);
  await expect(page.getByText(/Patient info|Reason for visit|Vitals/i).first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => window.scrollBy(0, 600));
  await pause(page, 12_000);
  await page.evaluate(() => window.scrollBy(0, 600));
  await pause(page, DEMO.pause.visit - 12_000);

  // Scene 5 — Calendar
  await goToNav(page, 'Calendar');
  await expect(page.getByRole('button', { name: 'Month' })).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.calendar);

  // Scene 6 — Doctors
  await goToNav(page, 'Doctors');
  await expect(page.getByPlaceholder(/Search doctor/i)).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.scene);

  // Scene 7 — Inventory
  await goToNav(page, 'Inventory');
  await expect(page.getByText(/Items|Available|Low stock/i).first()).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.scene);

  // Scene 8 — User management
  await expandUserManagement(page);
  await page.getByRole('link', { name: 'Staff' }).click();
  await waitForPortal(page);
  await pause(page, DEMO.pause.scene);
  await page.getByRole('link', { name: 'Roles' }).click();
  await waitForPortal(page);
  await pause(page, DEMO.pause.scene);

  // Scene 9 — Super admin platform
  await logout(page, DEMO.clinicOwner.name);
  await loginAsSuperAdmin(page);
  await goToNav(page, 'Clinics');
  await expect(page.getByRole('heading', { name: /Clinics/i })).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.platform);
  const firstClinic = page.locator('tbody tr').first();
  await expect(firstClinic).toBeVisible({ timeout: 30_000 });
  await firstClinic.getByRole('link', { name: 'View clinic' }).click();
  await waitForPortal(page);
  await pause(page, DEMO.pause.platform);
  await goToNav(page, 'Settings');
  await expect(page.getByText(/Appointments trial|Workspace and account/i).first()).toBeVisible({ timeout: 30_000 });
  await pause(page, DEMO.pause.scene);

  // Scene 10 — Closing
  await goToNav(page, 'Clinics');
  await pause(page, DEMO.pause.outro);
});
