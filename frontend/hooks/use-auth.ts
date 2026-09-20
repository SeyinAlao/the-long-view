'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type LoginInput,
  type RegisterInput,
} from '@/lib/auth';
import { ApiError } from '@/lib/api';

const CURRENT_USER_KEY = ['auth', 'me'];

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => loginUser(input),
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_KEY, data);
      router.push('/dashboard');
      router.refresh();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_KEY, data);
      router.push('/dashboard');
      router.refresh();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      router.push('/login');
      router.refresh();
    },
  });
}

// Both DTO validation errors (400) and credential errors (401/409) come
// back from the backend with a real message — this just makes it easy
// for a form to show that message instead of a generic "something went
// wrong."
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Something went wrong. Try again.';
}
