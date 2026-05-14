import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppButton, Card, HeroCard, Screen, StatCard } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { communityService } from "@/lib/api/services/community.service";
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

  const publicStatsQuery = useQuery({
    queryKey: ["platform", "landing", "community-preview"],
    queryFn: async () => {
      const [blogs, testimonies] = await Promise.all([
        communityService.getBlogs({ page_size: 6 }),
        communityService.getTestimonies({ page_size: 6 }),
      ]);
      return {
        blogs: blogs.count ?? blogs.results?.length ?? 0,
        testimonies: testimonies.count ?? testimonies.results?.length ?? 0,
      };
    },
  });

  const platformName = platformSettingsQuery.data?.name || "EduIgnite";
  const platformLogo = platformSettingsQuery.data?.logo;

  return (
    <Screen
      title={platformName}
      subtitle={t("landingSubtitle")}
      rightAction={<LanguageToggle />}
      contentContainerStyle={styles.content}
    >
      <HeroCard
        eyebrow={t("landingEyebrow")}
        title={t("landingTitle")}
        description={t("landingSubtitle")}
      >
        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            {platformName} connects executive, school, staff, student, parent, bursar, and library workflows from the same backend.
          </Text>
        </View>
      </HeroCard>

      <Card style={styles.brandCard}>
        <View style={styles.brandRow}>
          {platformLogo ? (
            <Image source={{ uri: platformLogo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>EI</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>{platformName}</Text>
            <Text style={styles.brandSubtitle}>
              Backend identity and visual branding loaded from the live platform settings.
            </Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <AppButton label={t("login")} onPress={() => navigation.navigate("Login")} />
          <AppButton
            label={t("activateAccount")}
            variant="ghost"
            onPress={() => navigation.navigate("Activate")}
          />
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        <StatCard
          label="Community Stories"
          value={publicStatsQuery.data?.blogs ?? 0}
          helper="Published community and institutional posts."
        />
        <StatCard
          label="Public Testimonies"
          value={publicStatsQuery.data?.testimonies ?? 0}
          helper="Approved stories visible on the shared platform."
          tone="success"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  brandCard: {
    gap: theme.spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: palette.surface,
  },
  logoFallback: {
    width: 74,
    height: 74,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  logoFallbackText: {
    color: palette.surface,
    fontSize: 24,
    fontWeight: "900",
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: palette.primary,
  },
  brandSubtitle: {
    marginTop: 4,
    color: palette.textMuted,
    lineHeight: 20,
  },
  buttonRow: {
    gap: theme.spacing.sm,
  },
  heroFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
  },
  heroFooterText: {
    color: "rgba(255,255,255,0.84)",
    lineHeight: 20,
  },
});
