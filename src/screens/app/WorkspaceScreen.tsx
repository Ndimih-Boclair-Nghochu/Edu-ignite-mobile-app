import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Text, View } from "react-native";
import { AppButton, Card, EmptyState, HeroCard, Screen, SectionTitle } from "@/components/ui";
import { getModulesForRole } from "@/features/modules";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";

export function WorkspaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const modules = getModulesForRole(user?.role);

  return (
    <Screen
      title="Workspace"
      subtitle="Role-aware mobile operations, powered by the same EduIgnite backend endpoints."
    >
      <HeroCard
        eyebrow="Operational Access"
        title={user?.name ?? "EduIgnite User"}
        description="Choose the working area you need. Data and sync state remain shared with the web platform."
      />

      <SectionTitle
        title="Available Modules"
        subtitle="The screens below are unlocked for the active role on this device."
      />
      {modules.length ? (
        <View style={{ gap: 12 }}>
          {modules.map((module) => {
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
                <AppButton label={`Open ${module.title}`} onPress={() => navigation.navigate(module.route)} />
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="No dedicated module yet"
          description="This role currently works mainly through dashboard, profile, announcements, and messaging on mobile."
        />
      )}
    </Screen>
  );
}
