import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { Alert, Linking, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { liveClassesService } from "@/lib/api/services/live-classes.service";
import { formatDateTime } from "@/lib/utils/format";

export function LiveClassesScreen() {
  const statsQuery = useQuery({
    queryKey: ["live-classes", "stats"],
    queryFn: () => liveClassesService.getStats(),
  });

  const liveNowQuery = useQuery({
    queryKey: ["live-classes", "live-now"],
    queryFn: () => liveClassesService.getLiveNow(),
  });

  const upcomingQuery = useQuery({
    queryKey: ["live-classes", "upcoming"],
    queryFn: () => liveClassesService.getUpcoming(),
  });

  const myClassesQuery = useQuery({
    queryKey: ["live-classes", "mine"],
    queryFn: () => liveClassesService.getMyClasses(),
  });

  const enrolledQuery = useQuery({
    queryKey: ["live-classes", "enrolled"],
    queryFn: () => liveClassesService.getEnrolledClasses(),
  });

  const enrollMutation = useMutation({
    mutationFn: (id: string) => liveClassesService.enroll(id),
    onSuccess: async () => {
      await Promise.all([liveNowQuery.refetch(), upcomingQuery.refetch(), enrolledQuery.refetch()]);
      Alert.alert("Class updated", "The class enrollment has been recorded.");
    },
    onError: (error) => Alert.alert("Enrollment failed", getApiErrorMessage(error)),
  });

  async function openMeeting(url?: string) {
    if (!url) {
      Alert.alert("Meeting unavailable", "This class does not yet have a meeting link.");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        "Could not open link",
        error instanceof Error ? error.message : "The meeting link could not be opened."
      );
    }
  }

  return (
    <Screen
      title="Live Classes"
      subtitle="Live sessions, upcoming classes, teacher delivery, and meeting access from the shared classroom backend."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Total Sessions" value={statsQuery.data?.total ?? 0} helper="All tracked live classes for this school." />
        <StatCard label="Live Now" value={statsQuery.data?.live_now ?? 0} helper="Sessions currently in progress." tone="warning" />
        <StatCard label="Upcoming" value={statsQuery.data?.upcoming ?? 0} helper="Scheduled classes coming up next." />
        <StatCard label="My Classes" value={myClassesQuery.data?.results?.length ?? enrolledQuery.data?.results?.length ?? 0} helper="Classes created by or linked to this account." tone="success" />
      </View>

      <SectionTitle title="Live Now" subtitle="Sessions currently active for the institution." />
      {liveNowQuery.isLoading && !liveNowQuery.data ? (
        <LoadingState label="Loading live classes..." />
      ) : (liveNowQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(liveNowQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.platform} />
                <Tag label={entry.status} tone="warning" />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{entry.title}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || entry.subject_display || "Subject pending"} • {entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name} • Started: {formatDateTime(entry.start_time)}
              </Text>
              <AppButton label="Open Meeting" onPress={() => void openMeeting(entry.meeting_url)} />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No live classes right now" description="Live classroom sessions will appear here when they start." />
      )}

      <SectionTitle title="Upcoming Schedule" subtitle="Planned live sessions still ahead." />
      {upcomingQuery.isLoading && !upcomingQuery.data ? (
        <LoadingState label="Loading upcoming classes..." />
      ) : (upcomingQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(upcomingQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.platform} />
                <Tag label={`${entry.enrolled_count} enrolled`} tone="success" />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{entry.title}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || entry.subject_display || "Subject pending"} • {entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Starts: {formatDateTime(entry.start_time)} • Duration: {entry.duration_minutes} min
              </Text>
              <View style={{ gap: 10 }}>
                <AppButton label="Open Details" variant="secondary" onPress={() => void openMeeting(entry.meeting_url)} />
                <AppButton
                  label="Enroll"
                  variant="ghost"
                  onPress={() => enrollMutation.mutate(entry.id)}
                  loading={enrollMutation.isPending}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No upcoming live classes"
          description="Scheduled classroom sessions will appear here once they are created."
        />
      )}

      <SectionTitle title="Linked To This Account" subtitle="Classes created by or enrolled for this account." />
      {myClassesQuery.isLoading && enrolledQuery.isLoading && !myClassesQuery.data && !enrolledQuery.data ? (
        <LoadingState label="Loading linked classes..." />
      ) : (myClassesQuery.data?.results ?? enrolledQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {[...(myClassesQuery.data?.results ?? []), ...(enrolledQuery.data?.results ?? [])]
            .slice(0, 12)
            .map((entry) => (
              <Card key={`${entry.id}-${entry.start_time}`}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Tag label={entry.status} />
                  {entry.is_recorded ? <Tag label="Recorded" tone="success" /> : null}
                </View>
                <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>{entry.title}</Text>
                <Text style={{ color: "#667085" }}>
                  {entry.subject_name || entry.subject_display || "Subject pending"} • {entry.target_class}
                </Text>
                <Text style={{ color: "#667085", lineHeight: 20 }}>
                  {formatDateTime(entry.start_time)}
                </Text>
              </Card>
            ))}
        </View>
      ) : (
        <EmptyState
          title="No linked classes yet"
          description="Classes created by or connected to this account will appear here."
        />
      )}
    </Screen>
  );
}
