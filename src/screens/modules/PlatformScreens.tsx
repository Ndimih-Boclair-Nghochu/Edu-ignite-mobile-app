import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { communityService } from "@/lib/api/services/community.service";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { supportService } from "@/lib/api/services/support.service";
import { usersService } from "@/lib/api/services/users.service";
import { formatDate, formatMoney, formatRole } from "@/lib/utils/format";

export function FoundersScreen() {
  const foundersQuery = useQuery({
    queryKey: ["platform", "founders"],
    queryFn: () => usersService.getFounders(),
  });

  return (
    <Screen
      title="Founders"
      subtitle="Founder registry, share structures, and executive participation loaded from the live backend."
    >
      {foundersQuery.isLoading && !foundersQuery.data ? (
        <LoadingState label="Loading founders..." />
      ) : foundersQuery.data?.length ? (
        <View style={{ gap: 12 }}>
          {foundersQuery.data.map((founder) => (
            <Card key={founder.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={founder.founder_title || formatRole(founder.role)} />
                <Tag label={`${founder.total_share_percentage}%`} tone="success" />
                <Tag label={founder.access_level} />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {founder.name}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {founder.email} • {formatRole(founder.role)}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                Renewable shares: {founder.has_renewable_shares ? "Yes" : "No"}
                {founder.shares_expire_at ? ` • expires ${formatDate(founder.shares_expire_at)}` : ""}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No founders yet" description="Founder records will appear here once they exist on the platform." />
      )}
    </Screen>
  );
}

export function SchoolsScreen() {
  const statsQuery = useQuery({
    queryKey: ["platform", "school-stats"],
    queryFn: () => platformService.getPlatformStats(),
  });

  const schoolsQuery = useQuery({
    queryKey: ["platform", "schools", "list"],
    queryFn: () => schoolsService.getSchools({ page_size: 50 }),
  });

  return (
    <Screen
      title="Schools"
      subtitle="Registered institution nodes and their live distribution across the platform."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Total Schools" value={statsQuery.data?.total_schools ?? 0} helper="All registered school nodes." />
        <StatCard label="Active Schools" value={statsQuery.data?.active_schools ?? 0} helper="Nodes currently active on the platform." tone="success" />
        <StatCard label="Total Students" value={statsQuery.data?.total_students ?? 0} helper="Aggregated student population across the network." />
        <StatCard label="Total Teachers" value={statsQuery.data?.total_teachers ?? 0} helper="Aggregated teaching workforce across the network." />
      </View>

      <SectionTitle title="Institution Registry" subtitle="Live school nodes returned by the backend." />
      {schoolsQuery.isLoading && !schoolsQuery.data ? (
        <LoadingState label="Loading schools..." />
      ) : (schoolsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(schoolsQuery.data?.results ?? []).map((school) => (
            <Card key={school.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={school.status || "Active"} tone={school.status === "Active" ? "success" : "warning"} />
                {school.region ? <Tag label={school.region} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{school.name}</Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {school.short_name || school.shortName || "No short name"} • {school.location || "Location not set"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {school.student_count ?? 0} students • {school.teacher_count ?? 0} teachers
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No schools found" description="Registered schools will appear here." />
      )}
    </Screen>
  );
}

export function SupportScreen() {
  const statsQuery = useQuery({
    queryKey: ["platform", "support", "stats"],
    queryFn: () => supportService.getSupportStats(),
  });

  const supportQuery = useQuery({
    queryKey: ["platform", "support", "contributions"],
    queryFn: () => supportService.getSupportContributions({ page_size: 40 }),
  });

  return (
    <Screen
      title="Support Registry"
      subtitle="Support contributions and platform backing records available to executive accounts."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Support Revenue" value={formatMoney(statsQuery.data?.total_revenue)} helper="Platform support amount recorded so far." tone="success" />
        <StatCard label="Active Users" value={statsQuery.data?.active_users ?? 0} helper="Live user participation across the platform." />
        <StatCard label="New Orders" value={statsQuery.data?.new_orders ?? 0} helper="Fresh onboarding or order requests in the pipeline." />
      </View>

      <SectionTitle title="Contribution Ledger" subtitle="Latest support contributions from the backend." />
      {supportQuery.isLoading && !supportQuery.data ? (
        <LoadingState label="Loading support contributions..." />
      ) : (supportQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(supportQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "Verified" ? "success" : "warning"} />
                {(entry.payment_method || entry.method) ? <Tag label={entry.payment_method || entry.method || "Method"} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {entry.user?.name || entry.userName || "Supporter"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {formatMoney(entry.amount)} • {entry.schoolName || entry.school || "Platform contribution"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>{entry.message}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No contributions yet" description="Support contributions will appear here once recorded." />
      )}
    </Screen>
  );
}

export function TestimonialsScreen() {
  const testimoniesQuery = useQuery({
    queryKey: ["platform", "testimonies"],
    queryFn: () => communityService.getTestimonies({ page_size: 40 }),
  });

  const pendingQuery = useQuery({
    queryKey: ["platform", "testimonies", "pending"],
    queryFn: () => communityService.getPendingTestimonies({ page_size: 20 }),
  });

  const approvedCount = useMemo(
    () => (testimoniesQuery.data?.results ?? []).filter((item) => item.status === "approved").length,
    [testimoniesQuery.data?.results]
  );

  return (
    <Screen
      title="Testimonials"
      subtitle="Community testimonies and approval status across the live platform."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Total Testimonies" value={testimoniesQuery.data?.count ?? 0} helper="Stories submitted to the community portal." />
        <StatCard label="Approved" value={approvedCount} helper="Testimonies already visible to the public portal." tone="success" />
        <StatCard label="Pending Review" value={pendingQuery.data?.count ?? 0} helper="Stories still waiting for executive review." tone="warning" />
      </View>

      <SectionTitle title="Latest Testimonies" subtitle="Recent stories returned by the backend testimony service." />
      {testimoniesQuery.isLoading && !testimoniesQuery.data ? (
        <LoadingState label="Loading testimonies..." />
      ) : (testimoniesQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(testimoniesQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "approved" ? "success" : "warning"} />
                {entry.role_display || entry.role ? <Tag label={entry.role_display || entry.role || "Role"} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {entry.name || entry.author?.name || "Community member"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>{entry.message}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No testimonies yet" description="Submitted testimonies will appear here." />
      )}
    </Screen>
  );
}

export function PlatformSettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["platform", "settings", "editor"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [honourRollThreshold, setHonourRollThreshold] = useState("");

  React.useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }
    setName(settingsQuery.data.name || "");
    setDeadline(settingsQuery.data.payment_deadline || settingsQuery.data.paymentDeadline || "");
    setHonourRollThreshold(
      String(
        settingsQuery.data.honour_roll_threshold ?? settingsQuery.data.honourRollThreshold ?? 15
      )
    );
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      platformService.updatePlatformSettings({
        name: name.trim(),
        payment_deadline: deadline.trim(),
        honour_roll_threshold: Number(honourRollThreshold || 15),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      Alert.alert("Platform settings updated", "The mobile app has saved the current platform settings.");
    },
    onError: (error) => {
      Alert.alert("Save failed", getApiErrorMessage(error));
    },
  });

  return (
    <Screen
      title="Portfolio & Policy"
      subtitle="Platform identity, deadlines, and key policy settings pulled from the same backend used on web."
    >
      {settingsQuery.isLoading && !settingsQuery.data ? (
        <LoadingState label="Loading platform settings..." />
      ) : (
        <>
          <Card>
            {settingsQuery.data?.logo ? (
              <Image
                source={{ uri: settingsQuery.data.logo }}
                resizeMode="contain"
                style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: "#FFFFFF" }}
              />
            ) : null}
            <Field label="Platform Name" value={name} onChangeText={setName} placeholder="EduIgnite" />
            <Field
              label="Payment Deadline"
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="Honour Roll Threshold"
              value={honourRollThreshold}
              onChangeText={setHonourRollThreshold}
              placeholder="15"
              keyboardType="numeric"
            />
            <AppButton
              label="Save Platform Settings"
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            />
          </Card>

          <Card>
            <SectionTitle title="License Fee Matrix" subtitle="Current role-based platform fee policy." />
            <View style={{ gap: 10 }}>
              {Object.entries(settingsQuery.data?.fees ?? {}).map(([role, amount]) => (
                <View
                  key={role}
                  style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
                >
                  <Text style={{ color: "#102032", fontWeight: "800" }}>{formatRole(role)}</Text>
                  <Text style={{ color: "#667085" }}>{formatMoney(amount)}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
