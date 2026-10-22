"use client";

import type { CurrentUser } from "@car-rental/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./api";

export const authKeys = { me: ["auth", "me"] as const };

/** `useAuth`: the current user (null for visitors) plus role helpers. */
export function useAuth() {
  const query = useQuery({ queryKey: authKeys.me, queryFn: authApi.me, staleTime: 60_000 });
  const user = query.data ?? null;
  return {
    user,
    isLoading: query.isPending,
    isOwner: user?.roles.includes("owner") ?? false,
  };
}

function useSetUser() {
  const queryClient = useQueryClient();
  return (user: CurrentUser | null) => {
    // Everything cached belonged to the previous identity.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    queryClient.setQueryData(authKeys.me, user);
  };
}

export function useLogin() {
  const setUser = useSetUser();
  return useMutation({ mutationFn: authApi.login, onSuccess: setUser });
}

export function useRegister() {
  const setUser = useSetUser();
  return useMutation({ mutationFn: authApi.register, onSuccess: setUser });
}

export function useLogout() {
  const setUser = useSetUser();
  return useMutation({ mutationFn: authApi.logout, onSettled: () => setUser(null) });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: authApi.updateProfile, onSuccess: (user) => queryClient.setQueryData(authKeys.me, user) });
}

export function useBecomeOwner() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: authApi.becomeOwner, onSuccess: (user) => queryClient.setQueryData(authKeys.me, user) });
}

/** Confirms the emailed token; the returned user may now include roles granted on verification. */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    // The link may be opened while signed out or as someone else: only refresh our own record.
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, (current: CurrentUser | null | undefined) => (current?.id === user.id ? user : current)),
  });
}

export function useResendVerification() {
  return useMutation({ mutationFn: () => authApi.resendVerification() });
}

/** Only allows same-site relative paths, so `?next=` can't redirect off-site. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
