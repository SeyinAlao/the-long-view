import { apiFetch } from './api';

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function registerUser(input: RegisterInput) {
  return apiFetch<{ user: SafeUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function loginUser(input: LoginInput) {
  return apiFetch<{ user: SafeUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logoutUser() {
  return apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
}

export function fetchCurrentUser() {
  return apiFetch<{ user: SafeUser }>('/auth/me');
}

// Same-origin, like every other API call from the browser. Google then
// sends the person back to GOOGLE_CALLBACK_URL, which must also be on
// this app's domain (/api/auth/google/callback) - that response is the
// one that sets the session cookie.
export function googleSignInUrl(): string {
  return '/api/auth/google';
}
