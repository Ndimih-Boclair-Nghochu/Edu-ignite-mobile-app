import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/api/query-client";
import { AuthProvider } from "@/providers/AuthProvider";
import { SyncProvider } from "@/providers/SyncProvider";
import { palette } from "@/theme";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "eduignite_mobile_query_cache",
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      })
    );
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            buster: "eduignite-mobile-v1",
          }}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SyncProvider>{children}</SyncProvider>
            </AuthProvider>
          </QueryClientProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
