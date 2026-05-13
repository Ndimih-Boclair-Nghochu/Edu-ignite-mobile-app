import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { AppButton, Card, HeroCard, LoadingState, Screen, SectionTitle, StatCard, Tag } from "@/components/ui";
import { getModulesForRole } from "@/features/modules";
import { announcementsService } from "@/lib/api/services/announcements.service";
import { feesService } from "@/lib/api/services/fees.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { studentsService } from "@/lib/api/services/students.service";
import { usersService } from "@/lib/api/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatMoney, formatRole } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const STAFF_ROLES = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN"];

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isOfflineSession } = useAuth();
  const { queue } = useSync();
  const modules = getModulesForRole(user?.role);

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const registrySummaryQuery = useQuery({
    queryKey: queryKeys.students.summary,
    queryFn: () => studentsService.getRegistrySummary(),
    enabled: Boolean(user && ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"].includes(user.role)),
  });

  const feeSummaryQuery = useQuery({
    queryKey: queryKeys.fees.summary(),
    queryFn: () => feesService.getSchoolFeeSummary(),
    enabled: Boolean(user && ["SCHOOL_ADMIN", "SUB_ADMIN", "BURSAR"].includes(user.role)),
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({ limit: 200 }),
    queryFn: () => usersService.getUsers({ limit: 200 }),
    enabled: Boolean(user && ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"].includes(user.role)),
  });

  const announcementsQuery = useQuery({
    queryKey: queryKeys.announcements.feed({ limit: 5 }),
    queryFn: () => announcementsService.getMyAnnouncementFeed({ limit: 5 }),
    enabled: Boolean(user),
  });

  const staffCount = useMemo(() => {
    return (usersQuery.data?.results ?? []).filter((staff) => STAFF_ROLES.includes(staff.role)).length;
  }, [usersQuery.data?.results]);

  const highlightCards = useMemo(() => {
    const registry = registrySummaryQuery.data;
    const fees = feeSummaryQuery.data?.filtered_totals;

    if (user?.role === "BURSAR") {
      return [
        {
          label: "Classes Covered",
          value: feeSummaryQuery.data?.filtered_totals.class_count ?? 0,
          helper: "School fee assignments currently active.",
        },
        {
          label: "Total Expected",
          value: formatMoney(fees?.total_expected),
          helper: "Amount expected from all assigned classes.",
        },
        {
          label: "Collected",
          value: formatMoney(fees?.total_collected),
          helper: "Amount already recorded by the bursar desk.",
        },
        {
          label: "Outstanding",
          value: formatMoney(fees?.total_outstanding),
          helper: "Balance still left to recover across classes.",
        },
      ];
    }

    return [
      {
        label: "Active Enrollment",
        value: registry?.active_enrollment ?? schoolQuery.data?.student_count ?? 0,
        helper: "Learners linked to this school.",
      },
      {
        label: "Staff Registry",
        value: staffCount,
        helper: "Teachers, admins, bursars, and librarians in scope.",
      },
      {
        label: "Collected Fees",
        value: formatMoney(fees?.total_collected),
        helper: "Live school-fee amount recorded in the ledger.",
      },
      {
        label: "Pending Sync",
        value: queue.length,
        helper: "Queued offline changes waiting for connectivity.",
      },
    ];
  }, [
    feeSummaryQuery.data?.filtered_totals,
    queue.length,
    registrySummaryQuery.data,
    schoolQuery.data?.student_count,
    staffCount,
    user?.role,
  ]);

  return (
    <Screen
      title="Overview"
      subtitle="A mobile snapshot of the same EduIgnite institution backend used on web."
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? user?.matricule ?? "EduIgnite"}
        title={schoolQuery.data?.name ?? user?.name ?? "EduIgnite Node"}
        description={`${formatRole(user?.role)} workspace with ${isOfflineSession ? "offline continuity enabled" : "live backend sync active"}.`}
      >
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <Tag label={user?.role ?? "User"} />
          <Tag label={isOfflineSession ? "Offline Session" : "Live Session"} tone={isOfflineSession ? "warning" : "success"} />
        </View>
      </HeroCard>

      <View style={{ gap: 12 }}>
        {highlightCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            tone={card.label.includes("Collected") ? "success" : "default"}
          />
        ))}
      </View>

      <SectionTitle
        title="Quick Modules"
        subtitle="Jump into the operational areas that belong to this account."
      />
      <View style={{ gap: 12 }}>
        {modules.slice(0, 4).map((module) => {
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
                  label="Open"
                  variant="ghost"
                  onPress={() => navigation.navigate(module.route)}
                />
              </View>
            </Card>
          );
        })}
      </View>

      <SectionTitle title="Recent Announcements" subtitle="Latest notices reaching this account." />
      {announcementsQuery.isLoading && !announcementsQuery.data ? (
        <LoadingState label="Loading school announcements..." />
      ) : (announcementsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(announcementsQuery.data?.results ?? []).map((announcement) => (
            <Card key={announcement.id}>
              <Tag label={announcement.target ?? "general"} />
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {announcement.title}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{announcement.content}</Text>
            </Card>
          ))}
          <AppButton
            label="Open Announcements"
            variant="secondary"
            onPress={() => navigation.navigate("Announcements")}
          />
        </View>
      ) : (
        <Card>
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            No recent announcement is cached for this account yet.
          </Text>
        </Card>
      )}

      {schoolQuery.isLoading && !schoolQuery.data ? (
        <LoadingState label="Loading school details..." />
      ) : (
        <Card>
          <SectionTitle
            title="Institution Snapshot"
            subtitle="Core school identity pulled from the shared backend."
            rightAction={
              modules.length ? (
                <AppButton
                  compact
                  variant="ghost"
                  label="Workspace"
                  onPress={() => navigation.navigate("Tabs", { screen: "Workspace" } as never)}
                />
              ) : null
            }
          />
          <Text style={{ color: "#102032", fontWeight: "800" }}>
            {schoolQuery.data?.name ?? "School account in use"}
          </Text>
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            {schoolQuery.data?.motto || "Dedicated to secure academic operations across web and mobile."}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ArrowRight color="#264D73" size={16} />
            <Text style={{ color: "#264D73", fontWeight: "700" }}>
              {schoolQuery.data?.location ?? "Location not yet configured"}
            </Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}
