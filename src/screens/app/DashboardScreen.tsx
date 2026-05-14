import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Text, View } from "react-native";
import { AppButton, Card, HeroCard, Screen, SectionTitle } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getModulesForRole } from "@/features/modules";
import { isExecutiveRole } from "@/features/roles";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { formatRole } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/providers/I18nProvider";
import { useAuth } from "@/providers/AuthProvider";
import { RoleDashboardPanel } from "./dashboard-panels";

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { t } = useI18n();
  const modules = getModulesForRole(user?.role ?? null);
  const executive = isExecutiveRole(user?.role);

  const platformSettingsQuery = useQuery({
    queryKey: ["platform", "settings", "dashboard"],
    queryFn: () => platformService.getPlatformSettings(),
    enabled: executive,
  });

  const schoolQuery = useQuery({
    queryKey: ["schools", "me", "dashboard"],
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user && !executive),
  });

  const workspaceTitle = executive
    ? platformSettingsQuery.data?.name || t("platformBoard", "Platform Board")
    : schoolQuery.data?.name || user?.school?.name || t("schoolWorkspace", "School Workspace");

  const eyebrow = executive
    ? t("executiveOverview", "Platform overview")
    : schoolQuery.data?.short_name || user?.school?.short_name || t("schoolOverview", "School overview");

  return (
    <Screen
      title={t("overview", "Overview")}
      subtitle="The mobile dashboard now follows the same live role logic and backend scope used by the web platform."
      rightAction={<LanguageToggle />}
    >
      <HeroCard
        eyebrow={eyebrow}
        title={workspaceTitle}
        description={`${formatRole(user?.role)} account connected to the same shared EduIgnite records used on web.`}
      />

      <RoleDashboardPanel />

      <SectionTitle
        title="Quick Modules"
        subtitle="Open the routes available to this exact account type on the shared platform."
      />
      <View style={{ gap: 12 }}>
        {modules.slice(0, 8).map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.key}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 18,
                    backgroundColor: "#E7F8FC",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon color="#264D73" size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {module.title}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>{module.description}</Text>
                </View>
                <AppButton
                  compact
                  label={t("openModule", "Open")}
                  variant="ghost"
                  onPress={() => navigation.navigate(module.route as never)}
                />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
