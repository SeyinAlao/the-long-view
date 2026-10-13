'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  acceptTerms,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type LoginInput,
  type RegisterInput,
} from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';
import { useThesisDraftStore } from '@/stores/thesis-draft-store';

export { apiErrorMessage as authErrorMessage };

const CURRENT_USER_KEY = ['auth', 'me'];

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
  });
}

export function useLogin(redirectTo = '/dashboard') {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => loginUser(input),
    onSuccess: (data) => {
      // Forget anything cached for whoever was here before - see useLogout.
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, data);
      // An account that hasn't accepted the current Terms accepts them
      // first, then carries on (ADR 014).
      router.push(data.user.termsAccepted ? redirectTo : termsStepFor(redirectTo));
      router.refresh();
    },
  });
}

export function termsStepFor(next: string): string {
  return `/welcome/terms?next=${encodeURIComponent(next)}`;
}

export function useAcceptTerms(next: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: acceptTerms,
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_KEY, data);
      router.push(next);
      router.refresh();
    },
  });
}

export function useRegister(redirectTo = '/dashboard') {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterInput) => registerUser(input),
    onSuccess: (data) => {
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, data);
      router.push(redirectTo);
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
      // Signing out has to forget everything tied to the person leaving,
      // not just who they were. Otherwise, on a shared browser, the next
      // person to sign in would see the previous person's cached data
      // (their drafts on My Research) and be offered their unpublished
      // in-progress thesis to "restore".
      queryClient.clear();
      useThesisDraftStore.getState().clear();
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      router.push('/login');
      router.refresh();
    },
  });
}

