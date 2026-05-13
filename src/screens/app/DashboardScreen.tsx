import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { AppButton, Card, HeroCard, LoadingState, Screen, SectionTitle, StatCard, Tag } from "@/components/ui";
import { getModulesForRole } from "@/features/modules";
import { announcementsService } from "@/lib/api/services/announcements.service";
import { attendanceService } from "@/lib/api/services/attendance.service";
import { feesService } from "@/lib/api/services/fees.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { studentsService } from "@/lib/api/services/students.service";
import { usersService } from "@/lib/api/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatMoney, formatRole } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";

const STAFF_ROLES = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN"];

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const modules = getModulesForRole();

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const registrySummaryQuery = useQuery({
    queryKey: queryKeys.students.summary,
    queryFn: () => studentsService.getRegistrySummary(),
    enabled: Boolean(user),
  });

  const studentsQuery = useQuery({
    queryKey: queryKeys.students.list({ page_size: 500 }),
    queryFn: () => studentsService.getStudents({ page_size: 500 }),
    enabled: Boolean(user),
  });

  const feeSummaryQuery = useQuery({
    queryKey: queryKeys.fees.summary(),
    queryFn: () => feesService.getSchoolFeeSummary(),
    enabled: Boolean(user),
  });

  const usersQuery = useQuery({
    queryKey: ["users", "school", schoolId, "staff"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: STAFF_ROLES.join(","),
        page_size: 500,
      }),
    enabled: Boolean(user && schoolId),
  });

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.records({ limit: 500 }),
    queryFn: () => attendanceService.getAttendanceRecords({ limit: 500 }),
    enabled: Boolean(user),
  });

  const announcementsQuery = useQuery({
    queryKey: queryKeys.announcements.feed({ limit: 5 }),
    queryFn: () => announcementsService.getMyAnnouncementFeed({ limit: 5 }),
    enabled: Boolean(user),
  });

  const staffCount = useMemo(() => {
    return Math.max(
      (usersQuery.data?.results ?? []).filter((staff) => STAFF_ROLES.includes(staff.role)).length,
      usersQuery.data?.count ?? 0,
      Number(schoolQuery.data?.teacher_count || 0)
    );
  }, [schoolQuery.data?.teacher_count, usersQuery.data?.count, usersQuery.data?.results]);

  const totalStudents = useMemo(() => {
    return Math.max(
      Number(registrySummaryQuery.data?.active_enrollment || 0),
      Number(registrySummaryQuery.data?.student_profiles || 0),
      studentsQuery.data?.count ?? 0,
      studentsQuery.data?.results?.length ?? 0,
      Number(schoolQuery.data?.student_count || 0)
    );
  }, [registrySummaryQuery.data, schoolQuery.data?.student_count, studentsQuery.data]);

  const attendanceHealth = useMemo(() => {
    const rows = attendanceQuery.data?.results ?? [];
    if (!rows.length) {
      return 0;
    }

    const classBuckets = rows.reduce<Record<string, { total: number; present: number }>>(
      (accumulator, record) => {
        const className = record.student?.student_class || "Unassigned";
        if (!accumulator[className]) {
          accumulator[className] = { total: 0, present: 0 };
        }
        accumulator[className].total += 1;
        if (["Present", "Late", "present", "late"].includes(record.status)) {
          accumulator[className].present += 1;
        }
        return accumulator;
      },
      {}
    );

    const classRates = Object.values(classBuckets).map((bucket) =>
      bucket.total ? Math.round((bucket.present / bucket.total) * 100) : 0
    );

    return classRates.length
      ? Math.round(classRates.reduce((sum, value) => sum + value, 0) / classRates.length)
      : 0;
  }, [attendanceQuery.data?.results]);

  const highlightCards = useMemo(() => {
    const schoolTotals = feeSummaryQuery.data?.school_totals;
    const filteredTotals = feeSummaryQuery.data?.filtered_totals;

    if (user?.role === "BURSAR") {
      return [
        {
          label: "Classes Covered",
          value: filteredTotals?.class_count ?? 0,
          helper: "School fee assignments currently active.",
        },
        {
          label: "Total Expected",
          value: formatMoney(filteredTotals?.total_expected),
          helper: "Amount expected from all assigned classes.",
        },
        {
          label: "Collected",
          value: formatMoney(filteredTotals?.total_collected),
          helper: "Amount already recorded by the bursar desk.",
        },
        {
          label: "Outstanding",
          value: formatMoney(filteredTotals?.total_outstanding),
          helper: "Balance still left to recover across classes.",
        },
      ];
    }

    return [
      {
        label: "Active Enrollment",
        value: totalStudents,
        helper: "Learners linked to this school.",
      },
      {
        label: "Staff Registry",
        value: staffCount,
        helper: "Teachers, admins, bursars, and librarians in scope.",
      },
      {
        label: "Total Revenue",
        value: formatMoney(schoolTotals?.total_collected ?? filteredTotals?.total_collected),
        helper: "Live school-fee amount recorded in the ledger.",
      },
      {
        label: "Attendance Health",
        value: `${attendanceHealth}%`,
        helper: "Average attendance across recorded class activity.",
      },
    ];
  }, [
    attendanceHealth,
    feeSummaryQuery.data?.filtered_totals,
    feeSummaryQuery.data?.school_totals,
    staffCount,
    totalStudents,
    user?.role,
  ]);

  return (
    <Screen
      title="Overview"
      subtitle="A live mobile view of the same institution records, counts, and backend workflows used on web."
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? user?.matricule ?? "EduIgnite"}
        title={schoolQuery.data?.name ?? user?.name ?? "EduIgnite Node"}
        description={`${formatRole(user?.role)} workspace connected to the same shared school dataset used across the web platform.`}
      >
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <Tag label={user?.role ?? "User"} />
          {schoolQuery.data?.short_name ? <Tag label={schoolQuery.data.short_name} tone="success" /> : null}
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
        subtitle="Open the same major work areas available from the shared EduIgnite institution workspace."
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
              No recent announcement is available for this account yet.
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
