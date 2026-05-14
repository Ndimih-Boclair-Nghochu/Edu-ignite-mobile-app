import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Alert, Text, View } from "react-native";
import { AppButton, Card, HeroCard, Screen, SectionTitle, UserAvatar } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { isExecutiveRole } from "@/features/roles";
import { schoolsService } from "@/lib/api/services/schools.service";
import { platformService } from "@/lib/api/services/platform.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatRole } from "@/lib/utils/format";
import { useI18n } from "@/providers/I18nProvider";
import { useAuth } from "@/providers/AuthProvider";

export function ProfileScreen() {
  const { refreshProfile, signOut, user } = useAuth();
  const { t } = useI18n();
  const executive = isExecutiveRole(user?.role);

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user && !executive),
  });

  const platformQuery = useQuery({
    queryKey: ["platform", "settings", "profile"],
    queryFn: () => platformService.getPlatformSettings(),
    enabled: executive,
  });

  return (
    <Screen title={t("profile", "Profile")} subtitle="Identity, scope, language, and mobile session controls." rightAction={<LanguageToggle />}>
      <HeroCard
        eyebrow={formatRole(user?.role)}
        title={user?.name ?? "EduIgnite User"}
        description={user?.email || "Account email not available"}
      />

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
        <SectionTitle title={executive ? "Platform Scope" : "School Scope"} subtitle={executive ? "The executive platform board currently attached to this account." : "The backend school currently attached to this account."} />
        <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
          {executive
            ? platformQuery.data?.name ?? "EduIgnite Platform"
            : schoolQuery.data?.name ?? user?.school?.name ?? "School not yet cached"}
        </Text>
        <Text style={{ color: "#667085", lineHeight: 20 }}>
          {executive
            ? "Platform-wide executive context"
            : schoolQuery.data?.location ?? user?.school?.location ?? "Location not yet available"}
        </Text>
        {!executive ? (
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            Principal: {schoolQuery.data?.principal ?? user?.school?.principal ?? "Not recorded"}
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle title={t("sessionControls", "Session Controls")} subtitle="Refresh the latest backend profile or clear this device session." />
        <AppButton
          label={t("refreshProfile", "Refresh Profile")}
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
        <AppButton label={t("logout", "Logout")} variant="danger" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}
