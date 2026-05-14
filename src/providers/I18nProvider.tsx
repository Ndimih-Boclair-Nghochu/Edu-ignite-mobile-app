import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "fr";

const LANGUAGE_STORAGE_KEY = "eduignite_mobile_language";

const translations = {
  en: {
    landingEyebrow: "Connected Education Infrastructure",
    landingTitle: "One EduIgnite platform across web and mobile.",
    landingSubtitle:
      "Use the same live backend, the same roles, and the same institutional records from a production-ready mobile workspace.",
    login: "Login",
    activateAccount: "Activate Account",
    overview: "Overview",
    workspace: "Workspace",
    messages: "Messages",
    profile: "Profile",
    workspaceLanguage: "Workspace Language",
    platformBoard: "Platform Board",
    schoolWorkspace: "School Workspace",
    executiveOverview: "Platform overview",
    schoolOverview: "School overview",
    welcomeBack: "Welcome back",
    openModule: "Open",
    noDataYet: "No data available yet.",
    logout: "Logout",
    refreshProfile: "Refresh Profile",
    sessionControls: "Session Controls",
  },
  fr: {
    landingEyebrow: "Infrastructure educative connectee",
    landingTitle: "Une seule plateforme EduIgnite sur le web et le mobile.",
    landingSubtitle:
      "Utilisez le meme backend en direct, les memes roles et les memes dossiers institutionnels depuis un espace mobile pret pour la production.",
    login: "Connexion",
    activateAccount: "Activer le compte",
    overview: "Vue d'ensemble",
    workspace: "Espace",
    messages: "Messages",
    profile: "Profil",
    workspaceLanguage: "Langue de l'espace",
    platformBoard: "Plateforme",
    schoolWorkspace: "Espace scolaire",
    executiveOverview: "Vue plateforme",
    schoolOverview: "Vue ecole",
    welcomeBack: "Bon retour",
    openModule: "Ouvrir",
    noDataYet: "Aucune donnee disponible pour le moment.",
    logout: "Deconnexion",
    refreshProfile: "Actualiser le profil",
    sessionControls: "Controle de session",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (!mounted) {
        return;
      }

      if (stored === "en" || stored === "fr") {
        setLanguageState(stored);
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: async (nextLanguage) => {
        setLanguageState(nextLanguage);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      },
      t: (key, fallback) => translations[language][key] ?? fallback ?? key,
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
