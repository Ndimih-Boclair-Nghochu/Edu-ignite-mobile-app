import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Alert, Text, View } from "react-native";
import { AppButton, Card, HeroCard, Screen, SectionTitle, Tag, UserAvatar } from "@/components/ui";
import { schoolsService } from "@/lib/api/services/schools.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

export function ProfileScreen() {
  const { refreshProfile, signOut, user } = useAuth();
  const { isOnline, queue } = useSync();

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  return (
    <Screen title="Profile" subtitle="Identity, school scope, and mobile session controls.">
      <HeroCard
        eyebrow={formatRole(user?.role)}
        title={user?.name ?? "EduIgnite User"}
        description={user?.email || "Account email not available"}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <Tag label={isOnline ? "Online" : "Offline"} tone={isOnline ? "success" : "warning"} />
          <Tag label={`${queue.length} queued`} />
        </View>
      </HeroCard>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <UserAvatar name={user?.name} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", fontSize: 18, color: "#102032" }}>
              {user?.name}
            </Text>
            <Text style={{ color: "#667085" }}>{user?.matricule || "No matricule cached"}</Text>
          </View>
        </View>
        <Text style={{ color: "#667085", lineHeight: 20 }}>
          Role: {formatRole(user?.role)}{user?.phone ? ` • ${user.phone}` : ""}
        </Text>
      </Card>

      <Card>
        <SectionTitle title="School Scope" subtitle="The backend school currently attached to this account." />
        <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
          {schoolQuery.data?.name ?? user?.school?.name ?? "School not yet cached"}
        </Text>
        <Text style={{ color: "#667085", lineHeight: 20 }}>
          {schoolQuery.data?.location ?? user?.school?.location ?? "Location not yet available"}
        </Text>
        <Text style={{ color: "#667085", lineHeight: 20 }}>
          Principal: {schoolQuery.data?.principal ?? user?.school?.principal ?? "Not recorded"}
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Session Controls" subtitle="Refresh the profile or clear this local session." />
        <AppButton
          label="Refresh My Profile"
          variant="secondary"
          onPress={async () => {
            try {
              await refreshProfile();
              Alert.alert("Profile refreshed", "The latest user data has been pulled from the backend.");
            } catch (error) {
              Alert.alert(
                "Refresh failed",
                error instanceof Error ? error.message : "Could not refresh the profile."
              );
            }
          }}
        />
        <AppButton label="Logout" variant="danger" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}
