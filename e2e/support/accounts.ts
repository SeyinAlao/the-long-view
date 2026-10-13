import { expect, type Page } from '@playwright/test';

export interface Account {
  name: string;
  username: string;
  email: string;
  password: string;
  // Sent as-is to /api/auth/register by the API helpers (ADR 014).
  acceptedTerms: true;
}

let counter = 0;

// A fresh, valid account each call. The database is cleared around
// every test, so these only need to be unique within one test.
export function newAccount(label: string): Account {
  counter += 1;
  const username = `${label}_${counter}`;
  return {
    name: `${label} Tester`,
    username,
    email: `${username}@example.com`,
    password: 'correct-horse-9',
    acceptedTerms: true,
  };
}

// Through the real form - for tests where signing up is the point.
export async function signUpWithForm(page: Page, account: Account): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Name', { exact: true }).fill(account.name);
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('checkbox', { name: /I agree to the Terms of Service/ }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signInWithForm(page: Page, account: Account): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// Straight to the API, through the frontend's /api rewrite, so the
// session cookie lands in the page's own browser context - for tests
// where the account is only setup.
export async function signUpWithApi(page: Page, account: Account): Promise<void> {
  const response = await page.request.post('/api/auth/register', { data: account });
  expect(response.status(), await response.text()).toBe(201);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
