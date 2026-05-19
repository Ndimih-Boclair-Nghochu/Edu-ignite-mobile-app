import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  LoadingState,
  ModalSheet,
  OptionChips,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { gradesService } from "@/lib/api/services/grades.service";
import { liveClassesService } from "@/lib/api/services/live-classes.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import type { CreateLiveClassRequest, LiveClassPlatform } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const platformOptions = [
  { label: "Jitsi", value: "jitsi" },
  { label: "Zoom", value: "zoom" },
  { label: "Google Meet", value: "google_meet" },
  { label: "Teams", value: "teams" },
];

function defaultClassStart() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

export function LiveClassesScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");
  const [platform, setPlatform] = useState<LiveClassPlatform>("jitsi");
  const [startTime, setStartTime] = useState(defaultClassStart());
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [maxParticipants, setMaxParticipants] = useState("100");

  const statsQuery = useQuery({
    queryKey: ["live-classes", "stats"],
    queryFn: () => liveClassesService.getStats(),
    enabled: isTeacher,
  });

  const liveNowQuery = useQuery({
    queryKey: ["live-classes", "live-now"],
    queryFn: () => liveClassesService.getLiveNow(),
    enabled: Boolean(user),
  });

  const upcomingQuery = useQuery({
    queryKey: ["live-classes", "upcoming"],
    queryFn: () => liveClassesService.getUpcoming(),
    enabled: Boolean(user),
  });

  const myClassesQuery = useQuery({
    queryKey: ["live-classes", "mine"],
    queryFn: () => liveClassesService.getMyClasses(),
    enabled: isTeacher,
  });

  const enrolledQuery = useQuery({
    queryKey: ["live-classes", "enrolled"],
    queryFn: () => liveClassesService.getEnrolledClasses(),
    enabled: isStudent,
  });

  const classesQuery = useQuery({
    queryKey: ["live-classes", "classes"],
    queryFn: () => schoolsService.getHierarchyClasses(),
    enabled: isTeacher,
  });

  const subjectsQuery = useQuery({
    queryKey: ["live-classes", "subjects"],
    queryFn: () => gradesService.getSubjects({ page_size: 300 }),
    enabled: isTeacher,
  });

  const selectedClass = useMemo(
    () => (classesQuery.data ?? []).find((entry) => entry.id === selectedClassId) ?? null,
    [classesQuery.data, selectedClassId]
  );

  const linkedClasses = isTeacher ? myClassesQuery.data?.results ?? [] : enrolledQuery.data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateLiveClassRequest) => liveClassesService.createLiveClass(payload),
    onSuccess: async () => {
      resetCreateForm();
      await Promise.all([myClassesQuery.refetch(), upcomingQuery.refetch(), liveNowQuery.refetch()]);
      Alert.alert("Live class saved", "The live class has been recorded.");
    },
    onError: (error) => Alert.alert("Live class failed", getApiErrorMessage(error)),
  });

  const enrollMutation = useMutation({
    mutationFn: (id: string) => liveClassesService.enroll(id),
    onSuccess: async () => {
      await Promise.all([liveNowQuery.refetch(), upcomingQuery.refetch(), enrolledQuery.refetch()]);
      Alert.alert("Class updated", "The class enrollment has been recorded.");
    },
    onError: (error) => Alert.alert("Enrollment failed", getApiErrorMessage(error)),
  });

  const classActionMutation = useMutation({
    mutationFn: (payload: { id: string; action: "start" | "end" | "cancel" }) => {
      if (payload.action === "start") {
        return liveClassesService.startClass(payload.id);
      }
      if (payload.action === "end") {
        return liveClassesService.endClass(payload.id);
      }
      return liveClassesService.cancelClass(payload.id);
    },
    onSuccess: async () => {
      await Promise.all([myClassesQuery.refetch(), upcomingQuery.refetch(), liveNowQuery.refetch()]);
      Alert.alert("Class updated", "The class status has been updated.");
    },
    onError: (error) => Alert.alert("Class update failed", getApiErrorMessage(error)),
  });

  function resetCreateForm() {
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setSubjectName("");
    setMeetingUrl("");
    setMeetingId("");
    setMeetingPassword("");
    setPlatform("jitsi");
    setStartTime(defaultClassStart());
    setDurationMinutes("45");
    setMaxParticipants("100");
  }

  async function handleCreateLiveClass() {
    if (!title.trim() || !selectedClass) {
      Alert.alert("Missing details", "Live class title and class are required.");
      return;
    }

    const selectedSubject = (subjectsQuery.data?.results ?? []).find((entry) => entry.id === selectedSubjectId);
    const payload: CreateLiveClassRequest = {
      title: title.trim(),
      description: description.trim(),
      subject: selectedSubjectId ?? undefined,
      subject_name: selectedSubject?.name ?? subjectName.trim(),
      school_class: selectedClass.id,
      target_class: selectedClass.name,
      meeting_url: meetingUrl.trim(),
      meeting_id: meetingId.trim(),
      meeting_password: meetingPassword.trim(),
      platform,
      start_time: startTime.trim() || defaultClassStart(),
      duration_minutes: Number.parseInt(durationMinutes, 10) || 45,
      max_participants: Number.parseInt(maxParticipants, 10) || 100,
    };

    if (!isOnline) {
      await enqueue("CREATE_LIVE_CLASS", payload, `Create live class: ${payload.title}`);
      resetCreateForm();
      Alert.alert("Live class saved", "The live class has been recorded.");
      return;
    }

    createMutation.mutate(payload);
  }

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

  function renderTeacherControls(entry: { id: string; status: string; meeting_url?: string }) {
    if (!isTeacher) {
      return null;
    }

    return (
      <View style={{ gap: 10 }}>
        {entry.status === "upcoming" ? (
          <AppButton
            label="Start Class"
            variant="secondary"
            onPress={() => classActionMutation.mutate({ id: entry.id, action: "start" })}
            loading={classActionMutation.isPending}
          />
        ) : null}
        {entry.status === "live" ? (
          <AppButton
            label="End Class"
            variant="secondary"
            onPress={() => classActionMutation.mutate({ id: entry.id, action: "end" })}
            loading={classActionMutation.isPending}
          />
        ) : null}
        {entry.status !== "ended" && entry.status !== "cancelled" ? (
          <AppButton
            label="Cancel Class"
            variant="danger"
            onPress={() => classActionMutation.mutate({ id: entry.id, action: "cancel" })}
            loading={classActionMutation.isPending}
          />
        ) : null}
        <AppButton label="Open Meeting" variant="ghost" onPress={() => void openMeeting(entry.meeting_url)} />
      </View>
    );
  }

  return (
    <Screen
      title="Live Classes"
      subtitle={isTeacher ? "Create, start, and manage live class sessions." : "Live sessions, upcoming classes, and meeting access."}
      rightAction={isTeacher ? <AppButton compact label="New" onPress={() => setCreateOpen(true)} /> : undefined}
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Total Sessions" value={statsQuery.data?.total ?? liveNowQuery.data?.count ?? 0} helper="Tracked live classes for this school." />
        <StatCard label="Live Now" value={statsQuery.data?.live_now ?? liveNowQuery.data?.count ?? 0} helper="Sessions currently in progress." tone="warning" />
        <StatCard label="Upcoming" value={statsQuery.data?.upcoming ?? upcomingQuery.data?.count ?? 0} helper="Scheduled classes coming up next." />
        <StatCard label="My Classes" value={linkedClasses.length} helper="Classes created by or linked to this account." tone="success" />
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
                {entry.subject_name || entry.subject_display || "Subject pending"} - {entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name} - Started: {formatDateTime(entry.start_time)}
              </Text>
              {isTeacher ? renderTeacherControls(entry) : <AppButton label="Open Meeting" onPress={() => void openMeeting(entry.meeting_url)} />}
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
                {entry.subject_name || entry.subject_display || "Subject pending"} - {entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Starts: {formatDateTime(entry.start_time)} - Duration: {entry.duration_minutes} min
              </Text>
              {isTeacher ? (
                renderTeacherControls(entry)
              ) : (
                <View style={{ gap: 10 }}>
                  <AppButton label="Open Details" variant="secondary" onPress={() => void openMeeting(entry.meeting_url)} />
                  {isStudent ? (
                    <AppButton
                      label="Enroll"
                      variant="ghost"
                      onPress={() => enrollMutation.mutate(entry.id)}
                      loading={enrollMutation.isPending}
                    />
                  ) : null}
                </View>
              )}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No upcoming live classes" description="Scheduled classroom sessions will appear here once they are created." />
      )}

      <SectionTitle title="Linked To This Account" subtitle="Classes created by or enrolled for this account." />
      {(myClassesQuery.isLoading || enrolledQuery.isLoading) && !linkedClasses.length ? (
        <LoadingState label="Loading linked classes..." />
      ) : linkedClasses.length ? (
        <View style={{ gap: 12 }}>
          {linkedClasses.slice(0, 12).map((entry) => (
            <Card key={`${entry.id}-${entry.start_time}`}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} />
                {entry.is_recorded ? <Tag label="Recorded" tone="success" /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>{entry.title}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || entry.subject_display || "Subject pending"} - {entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{formatDateTime(entry.start_time)}</Text>
              {isTeacher ? renderTeacherControls(entry) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No linked classes yet" description="Classes created by or connected to this account will appear here." />
      )}

      <ModalSheet visible={createOpen} title="Create Live Class" onClose={() => setCreateOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Live class title" />
          <OptionChips
            label="Class"
            options={(classesQuery.data ?? []).map((entry) => ({ label: entry.name, value: entry.id }))}
            value={selectedClassId}
            onChange={setSelectedClassId}
          />
          <OptionChips
            label="Subject"
            options={(subjectsQuery.data?.results ?? []).map((entry) => ({ label: entry.name, value: entry.id }))}
            value={selectedSubjectId}
            onChange={(value) => {
              setSelectedSubjectId(value);
              const selectedSubject = (subjectsQuery.data?.results ?? []).find((entry) => entry.id === value);
              setSubjectName(selectedSubject?.name ?? subjectName);
            }}
          />
          {!selectedSubjectId ? (
            <Field label="Subject Name" value={subjectName} onChangeText={setSubjectName} placeholder="Subject name" />
          ) : null}
          <OptionChips
            label="Platform"
            options={platformOptions}
            value={platform}
            onChange={(value) => setPlatform(value as LiveClassPlatform)}
          />
          <Field label="Start Time" value={startTime} onChangeText={setStartTime} placeholder="YYYY-MM-DD or ISO date" />
          <Field label="Duration Minutes" value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="numeric" placeholder="45" />
          <Field label="Meeting URL" value={meetingUrl} onChangeText={setMeetingUrl} placeholder="https://..." />
          <Field label="Meeting ID" value={meetingId} onChangeText={setMeetingId} placeholder="Meeting ID" />
          <Field label="Meeting Password" value={meetingPassword} onChangeText={setMeetingPassword} placeholder="Password" />
          <Field label="Max Participants" value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="numeric" placeholder="100" />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Class description" multiline />
          <AppButton label="Save Live Class" onPress={() => void handleCreateLiveClass()} loading={createMutation.isPending} />
        </View>
      </ModalSheet>
    </Screen>
  );
}
