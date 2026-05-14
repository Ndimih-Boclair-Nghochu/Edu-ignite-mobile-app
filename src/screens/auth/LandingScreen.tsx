import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { platformService } from "@/lib/api/services/platform.service";
import { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/providers/I18nProvider";
import { palette, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Landing">;

export function LandingScreen({ navigation }: Props) {
  const { t } = useI18n();

  const platformSettingsQuery = useQuery({
    queryKey: ["platform", "settings", "landing"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const platformName = platformSettingsQuery.data?.name || "EduIgnite";
  const platformLogo = platformSettingsQuery.data?.logo;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <LanguageToggle inverse />
      </View>

      <View style={styles.body}>
        <View style={styles.logoWrap}>
          {platformLogo ? (
            <Image source={{ uri: platformLogo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>
                {platformName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{platformName}</Text>
          <Text style={styles.subtitle}>{t("landingTitle")}</Text>
          <Text style={styles.supporting}>{t("landingSubtitle")}</Text>
        </View>

        <View style={styles.actions}>
          <AppButton label={t("login")} onPress={() => navigation.navigate("Login")} />
          <AppButton
            label={t("activateAccount")}
            variant="ghost"
            onPress={() => navigation.navigate("Activate")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    alignItems: "flex-end",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  logoWrap: {
    width: 132,
    height: 132,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  logo: {
    width: 104,
    height: 104,
  },
  logoFallback: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(38,77,115,0.18)",
  },
  logoFallbackText: {
    fontSize: 34,
    fontWeight: "900",
    color: palette.surface,
  },
  textBlock: {
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  title: {
    color: palette.surface,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: palette.surface,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  supporting: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: theme.spacing.sm,
  },
});
