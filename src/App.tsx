import React from "react";
import { StatusBar } from "react-native";
import { AppProviders } from "@/providers/AppProviders";
import { Navigation } from "@/navigation";
import { palette } from "@/theme";

export function App() {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
      <Navigation />
    </AppProviders>
  );
}
