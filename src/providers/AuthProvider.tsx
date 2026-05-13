import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/lib/api/services/auth.service";
import { clearTokens, getAccessToken, hydrateTokens } from "@/lib/api/client";
import { User } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import {
  clearStoredSession,
  getStoredUser,
  hasOfflineCredential,
  storeOfflineCredential,
  storeUser,
} from "@/lib/storage/session";

type AuthContextValue = {
  user: User | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isOfflineSession: boolean;
  signIn: (matricule: string, password: string) => Promise<{ mode: "online" | "offline" }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      await hydrateTokens();
      const cachedUser = await getStoredUser();
      const canUseOffline = await hasOfflineCredential();
      const netState = await NetInfo.fetch();
      const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

      if (!mounted) {
        return;
      }

      if (cachedUser && (getAccessToken() || canUseOffline)) {
        setUser(cachedUser);
        setIsOfflineSession(!isOnline);
        queryClient.setQueryData(queryKeys.auth.me, cachedUser);
      }

      if (getAccessToken() && isOnline) {
        try {
          const freshUser = await authService.getMe();
          if (!mounted) {
            return;
          }
          setUser(freshUser);
          setIsOfflineSession(false);
          queryClient.setQueryData(queryKeys.auth.me, freshUser);
          await storeUser(freshUser);
        } catch {
          if (!mounted && cachedUser) {
            return;
          }
        }
      }

      if (mounted) {
        setIsReady(true);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [queryClient]);

  const signIn = async (matricule: string, password: string) => {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (isOnline) {
      const response = await authService.login({ matricule, password });
      setUser(response.user);
      setIsOfflineSession(false);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
      await Promise.all([storeUser(response.user), storeOfflineCredential(matricule, password)]);
      return { mode: "online" as const };
    }

    const cachedUser = await getStoredUser();
    const isValid = await (await import("@/lib/storage/session")).validateOfflineCredential(
      matricule,
      password
    );

    if (!cachedUser || !isValid) {
      throw new Error(
        "Offline login is only available after the account has signed in successfully on this device."
      );
    }

    setUser(cachedUser);
    setIsOfflineSession(true);
    queryClient.setQueryData(queryKeys.auth.me, cachedUser);
    return { mode: "offline" as const };
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch {
      await clearTokens();
    } finally {
      setUser(null);
      setIsOfflineSession(false);
      queryClient.removeQueries();
      await clearStoredSession();
    }
  };

  const refreshProfile = async () => {
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    if (!isOnline || !getAccessToken()) {
      return user;
    }

    const refreshedUser = await authService.getMe();
    setUser(refreshedUser);
    setIsOfflineSession(false);
    queryClient.setQueryData(queryKeys.auth.me, refreshedUser);
    await storeUser(refreshedUser);
    return refreshedUser;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      isOfflineSession,
      signIn,
      signOut,
      refreshProfile,
      setUser,
    }),
    [isOfflineSession, isReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
