import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { AppButton, Card, EmptyState, HeroCard, Screen, SectionTitle } from "@/components/ui";
import { getModulesForRole } from "@/features/modules";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";

export function WorkspaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const modules = getModulesForRole();
  const groupedModules = useMemo(
    () => ({
      registry: modules.filter((module) => module.group === "registry"),
      academics: modules.filter((module) => module.group === "academics"),
      operations: modules.filter((module) => module.group === "operations"),
      insights: modules.filter((module) => module.group === "insights"),
    }),
    [modules]
  );

  return (
    <Screen
      title="Workspace"
      subtitle="A full mobile map of the same EduIgnite operations available on the shared web backend."
    >
      <HeroCard
        eyebrow="Full Access Workspace"
        title={user?.name ?? "EduIgnite User"}
        description="Open the same major school work areas, records, and live backend data that drive the web platform."
      />

      {modules.length ? (
        <View style={{ gap: 20 }}>
          {[
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
              title: "Insights & Engagement",
              subtitle: "Community, support, and AI-assisted institutional intelligence.",
              rows: groupedModules.insights,
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
                          label={`Open ${module.title}`}
                          onPress={() => navigation.navigate(module.route)}
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
