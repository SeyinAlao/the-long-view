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

// Plain navigation, not a fetch call — clicking this should send the
// whole browser to the backend, which redirects on to Google. There's
// no JSON response to handle client-side.
export function googleSignInUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return `${apiUrl}/auth/google`;
}
