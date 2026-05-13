import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { authService } from "@/lib/api/services/auth.service";
import type {
  LoginRequest,
  LogoutRequest,
  ChangePasswordRequest,
  ActivateAccountRequest,
} from "@/lib/api/types";
import { clearTokens, getAccessToken, setTokens } from "@/lib/api/client";

const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: async (data) => {
      if (data.access_token && data.refresh_token) {
        await setTokens(data.access_token, data.refresh_token);
      }
      if (data.user) {
        queryClient.setQueryData(authKeys.me(), data.user);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: LogoutRequest) => authService.logout(data),
    onSuccess: async () => {
      await clearTokens();
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authService.getMe(),
    enabled: !!getAccessToken(),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

export function useActivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivateAccountRequest) => authService.activateAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}
