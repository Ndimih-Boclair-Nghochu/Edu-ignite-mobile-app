import { useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  Card,
  EmptyState,
  Field,
  HeroCard,
  LoadingState,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { schoolsService } from "@/lib/api/services/schools.service";
import { staffRemarksService } from "@/lib/api/services/staff-remarks.service";
import { usersService } from "@/lib/api/services/users.service";
import { User } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";

const STAFF_ROLES = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN"];

export function StaffScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const staffQuery = useQuery({
    queryKey: ["users", "school", schoolId, "staff-registry"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: STAFF_ROLES.join(","),
        page_size: 500,
        ordering: "name",
      }),
    enabled: Boolean(schoolId),
  });

  const hierarchyStaffQuery = useQuery({
    queryKey: ["schools", "hierarchy", "staff", schoolId],
    queryFn: () => schoolsService.getHierarchyStaff(schoolId),
    enabled: Boolean(schoolId),
  });

  const remarksQuery = useQuery({
    queryKey: ["staff-remarks", "all"],
    queryFn: () => staffRemarksService.getRemarks({ page_size: 100 }),
    enabled: Boolean(user),
  });

  const staffRows = useMemo(() => {
    const map = new Map<string, User>();

    for (const entry of staffQuery.data?.results ?? []) {
      map.set(entry.id, entry);
    }

    for (const entry of hierarchyStaffQuery.data ?? []) {
      if (!map.has(entry.id)) {
        map.set(entry.id, entry);
      }
    }

    return Array.from(map.values()).filter((entry) => STAFF_ROLES.includes(entry.role));
  }, [hierarchyStaffQuery.data, staffQuery.data?.results]);

  const filteredStaff = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) {
      return staffRows;
    }

    return staffRows.filter((entry) =>
      `${entry.name ?? ""} ${entry.email ?? ""} ${entry.matricule ?? ""} ${entry.role ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [deferredSearch, staffRows]);

  const latestRemarks = useMemo(
    () =>
      (remarksQuery.data?.results ?? [])
        .filter((remark) => !remark.staff || !remark.staff.school_id || remark.staff.school_id === schoolId)
        .slice(0, 8),
    [remarksQuery.data?.results, schoolId]
  );

  const stats = useMemo(() => {
    const teachers = staffRows.filter((entry) => entry.role === "TEACHER").length;
    const leadership = staffRows.filter((entry) =>
      ["SCHOOL_ADMIN", "SUB_ADMIN"].includes(entry.role)
    ).length;
    const support = staffRows.filter((entry) =>
      ["BURSAR", "LIBRARIAN"].includes(entry.role)
    ).length;

    return { teachers, leadership, support };
  }, [staffRows]);

  return (
    <Screen
      title="Staff"
      subtitle="Leadership, teaching, support staff, and remarks from the same school backend used on web."
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? "Staff Registry"}
        title={schoolQuery.data?.name ?? "School staff registry"}
        description="Review the same leadership, teachers, bursars, librarians, and staff notes carried by the shared school workspace."
      />

      <View style={{ gap: 12 }}>
        <StatCard label="Staff Registry" value={staffRows.length} helper="All school staff currently in scope." />
        <StatCard label="Teachers" value={stats.teachers} helper="Teaching staff linked to this school." />
        <StatCard label="Leadership" value={stats.leadership} helper="School admins and sub-admins on record." />
        <StatCard label="Support Team" value={stats.support} helper="Bursars and librarians on record." />
      </View>

      <Field
        label="Search Staff"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, matricule, email, or role"
      />

      <SectionTitle title="Staff Directory" subtitle="Current staff records for this school." />
      {staffQuery.isLoading && hierarchyStaffQuery.isLoading && !staffRows.length ? (
        <LoadingState label="Loading staff directory..." />
      ) : filteredStaff.length ? (
        <View style={{ gap: 12 }}>
          {filteredStaff.map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {entry.name}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.matricule || "Matricule pending"} • {entry.email || "No email"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    {formatRole(entry.role)}
                    {entry.sub_school?.name ? ` • ${entry.sub_school.name}` : ""}
                    {entry.phone ? ` • ${entry.phone}` : ""}
                  </Text>
                </View>
                <Tag label={entry.role} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No staff found"
          description="The current school staff directory does not match this search."
        />
      )}

      <SectionTitle title="Latest Staff Remarks" subtitle="Recent staff observations and acknowledgements." />
      {remarksQuery.isLoading && !remarksQuery.data ? (
        <LoadingState label="Loading staff remarks..." />
      ) : latestRemarks.length ? (
        <View style={{ gap: 12 }}>
          {latestRemarks.map((remark) => (
            <Card key={remark.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={remark.remark_type || "Remark"} />
                {remark.acknowledged ? <Tag label="Acknowledged" tone="success" /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                {remark.staff?.name || "Staff member"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{remark.text}</Text>
              <Text style={{ color: "#667085", fontSize: 12 }}>
                {remark.admin?.name || remark.adminName || "Admin"} • {formatDateTime(remark.created_at || remark.date)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No staff remarks yet"
          description="Staff commendations, warnings, and observations will appear here."
        />
      )}
    </Screen>
  );
}
