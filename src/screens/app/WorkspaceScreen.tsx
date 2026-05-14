import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { AppButton, Card, EmptyState, HeroCard, Screen, SectionTitle, UserAvatar } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getModulesForRole } from "@/features/modules";
import { isExecutiveRole } from "@/features/roles";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { PlatformSettings, School } from "@/lib/api/types";
import { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/providers/I18nProvider";
import { useAuth } from "@/providers/AuthProvider";

export function WorkspaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { t } = useI18n();
  const executive = isExecutiveRole(user?.role);
  const modules = getModulesForRole(user?.role ?? null);
  const groupedModules = useMemo(
    () => ({
      platform: modules.filter((module) => module.group === "platform"),
      governance: modules.filter((module) => module.group === "governance"),
      registry: modules.filter((module) => module.group === "registry"),
      academics: modules.filter((module) => module.group === "academics"),
      operations: modules.filter((module) => module.group === "operations"),
      engagement: modules.filter((module) => module.group === "engagement"),
    }),
    [modules]
  );

  const scopeQuery = useQuery<School | PlatformSettings>({
    queryKey: executive ? ["platform", "settings", "workspace"] : ["schools", "me", "workspace"],
    queryFn: () => (executive ? platformService.getPlatformSettings() : schoolsService.getMySchool()),
    enabled: Boolean(user),
  });

  const scopeData = scopeQuery.data;
  const executiveScope = executive ? (scopeData as PlatformSettings | undefined) : undefined;
  const schoolScope = executive ? undefined : (scopeData as School | undefined);
  const scopeLogo = executive
    ? executiveScope?.logo
    : schoolScope?.logo || user?.school?.logo;
  const scopeName = executive
    ? executiveScope?.name || "EduIgnite"
    : schoolScope?.name || user?.school?.name || "School";

  return (
    <Screen
      title={t("workspace", "Workspace")}
      subtitle={scopeName}
      rightAction={<LanguageToggle />}
    >
      <HeroCard
        eyebrow={user?.matricule || "Workspace"}
        title={user?.name ?? "EduIgnite User"}
        description="Role workspace"
      />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <UserAvatar name={user?.name} uri={user?.avatar} size={58} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#102032" }}>
              {scopeName}
            </Text>
            <Text style={{ color: "#667085" }}>{user?.role}</Text>
          </View>
          {scopeLogo ? <UserAvatar name={scopeName} uri={scopeLogo} size={48} /> : null}
        </View>
      </Card>

      {modules.length ? (
        <View style={{ gap: 20 }}>
          {[
            {
              title: "Platform Control",
              subtitle: "Executive-only oversight across founders, schools, support, and policy.",
              rows: groupedModules.platform,
            },
            {
              title: "Governance",
              subtitle: "Settings, strategy, subscription, and recognition records.",
              rows: groupedModules.governance,
            },
            {
              title: "Registry & Structure",
              subtitle: "People, hierarchy, classes, and subject allocation.",
              rows: groupedModules.registry,
            },
            {
              title: "Academic Operations",
              subtitle: "Teaching, exams, assignments, and live class delivery.",
              rows: groupedModules.academics,
            },
            {
              title: "School Operations",
              subtitle: "Fees, attendance, announcements, and library access.",
              rows: groupedModules.operations,
            },
            {
              title: "Engagement & Intelligence",
              subtitle: "Community, feedback, announcements, and AI-assisted insight.",
              rows: groupedModules.engagement,
            },
          ]
            .filter((group) => group.rows.length)
            .map((group) => (
              <View key={group.title} style={{ gap: 12 }}>
                <SectionTitle title={group.title} subtitle={group.subtitle} />
                <View style={{ gap: 12 }}>
                  {group.rows.map((module) => {
                    const Icon = module.icon;
                    return (
                      <Card key={module.key}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                          <View
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 20,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "#E7F8FC",
                            }}
                          >
                            <Icon color="#264D73" size={24} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#102032" }}>
                              {module.title}
                            </Text>
                            <Text style={{ color: "#667085", lineHeight: 19 }}>
                              {module.description}
                            </Text>
                          </View>
                        </View>
                        <AppButton
                          label={`${t("openModule", "Open")} ${module.title}`}
                          onPress={() => navigation.navigate(module.route as never)}
                        />
                      </Card>
                    );
                  })}
                </View>
              </View>
            ))}
        </View>
      ) : (
        <EmptyState
          title="Workspace loading"
          description="The feature map will appear here once the mobile workspace has loaded."
        />
      )}
    </Screen>
  );
}
