import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  HeroCard,
  LoadingState,
  OptionChips,
  Screen,
  SectionTitle,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { attendanceService } from "@/lib/api/services/attendance.service";
import { gradesService } from "@/lib/api/services/grades.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { studentsService } from "@/lib/api/services/students.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const attendanceStatuses = [
  { label: "Present", value: "Present" },
  { label: "Absent", value: "Absent" },
  { label: "Late", value: "Late" },
  { label: "Excused", value: "Excused" },
];

export function AttendanceScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const isManager = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"].includes(user?.role ?? "");

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [period, setPeriod] = useState("Morning");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes(),
    queryFn: () => schoolsService.getHierarchyClasses(),
    enabled: isManager,
  });

  const subjectsQuery = useQuery({
    queryKey: ["subjects", "list"],
    queryFn: () => gradesService.getSubjects({ limit: 200 }),
    enabled: isManager,
  });

  const studentsQuery = useQuery({
    queryKey: queryKeys.students.list({ limit: 200 }),
    queryFn: () => studentsService.getStudents({ limit: 200 }),
    enabled: isManager,
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.attendance.sessions({ limit: 50 }),
    queryFn: () => attendanceService.getAttendanceSessions({ limit: 50 }),
    enabled: isManager,
  });

  const myAttendanceQuery = useQuery({
    queryKey: queryKeys.attendance.mine({ limit: 100 }),
    queryFn: () => attendanceService.getMyAttendance({ limit: 100 }),
    enabled: !isManager,
  });

  const recordAttendanceMutation = useMutation({
    mutationFn: async (payload: {
      school_class: string;
      student_class: string;
      subject?: string;
      date: string;
      period: string;
      records: Array<{
        student: string;
        status: "Present" | "Absent" | "Late" | "Excused";
      }>;
    }) => {
      const session = await attendanceService.createSession({
        school_class: payload.school_class,
        student_class: payload.student_class,
        subject: payload.subject,
        date: payload.date,
        period: payload.period,
      });

      return attendanceService.bulkRecordAttendance({
        sessionId: session.id,
        records: payload.records,
      });
    },
    onSuccess: async () => {
      await sessionsQuery.refetch();
      setStatusMap({});
      Alert.alert("Attendance saved", "The roll call has been stored on the backend.");
    },
    onError: (error) => Alert.alert("Attendance failed", getApiErrorMessage(error)),
  });

  const selectedClass = useMemo(
    () => (classesQuery.data ?? []).find((item) => item.id === selectedClassId) ?? null,
    [classesQuery.data, selectedClassId]
  );

  const classStudents = useMemo(() => {
    return (studentsQuery.data?.results ?? []).filter(
      (student) =>
        student.school_class_id === selectedClassId || student.school_class === selectedClassId
    );
  }, [selectedClassId, studentsQuery.data?.results]);

  const subjectOptions = useMemo(() => {
    return (subjectsQuery.data?.results ?? []).map((subject) => ({
      label: subject.name,
      value: subject.id,
    }));
  }, [subjectsQuery.data?.results]);

  async function handleSaveAttendance() {
    if (!selectedClassId || !selectedClass) {
      Alert.alert("Choose a class", "Select the class you want to record attendance for.");
      return;
    }

    if (!classStudents.length) {
      Alert.alert("No students", "The selected class has no learners in the current cache.");
      return;
    }

    const records = classStudents.map((student) => ({
      student: student.id,
      status: (statusMap[student.id] ?? "Present") as "Present" | "Absent" | "Late" | "Excused",
    }));

    const payload = {
      school_class: selectedClass.id,
      student_class: selectedClass.name,
      subject: selectedSubjectId ?? undefined,
      date,
      period,
      records,
    };

    if (!isOnline) {
      await enqueue("BULK_RECORD_ATTENDANCE", { sessionData: payload, records }, `Record attendance for ${selectedClass.name}`);
      setStatusMap({});
      Alert.alert("Queued offline", "The attendance batch will sync when the device reconnects.");
      return;
    }

    recordAttendanceMutation.mutate(payload);
  }

  if (!isManager) {
    return (
      <Screen
        title="Attendance"
        subtitle="A cached view of attendance records connected to this account."
      >
        <HeroCard
          eyebrow="My Attendance"
          title="Attendance History"
          description="Student and parent accounts can review the attendance records already synced to the shared backend."
        />

        {myAttendanceQuery.isLoading && !myAttendanceQuery.data ? (
          <LoadingState label="Loading attendance..." />
        ) : (myAttendanceQuery.data?.results ?? []).length ? (
          <View style={{ gap: 12 }}>
            {(myAttendanceQuery.data?.results ?? []).map((record) => (
              <Card key={record.id}>
                <Tag
                  label={record.status}
                  tone={record.status === "Present" ? "success" : record.status === "Late" ? "warning" : "danger"}
                />
                <Text style={{ fontWeight: "800", color: "#102032" }}>
                  {record.session_subject_name || "Attendance session"}
                </Text>
                <Text style={{ color: "#667085" }}>
                  {formatDate(record.session_date)} • {record.session_period || "Period not set"}
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No attendance records"
            description="No attendance entries are cached for this account yet."
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen
      title="Attendance"
      subtitle="Class roll calls and recent attendance sessions from the live backend."
    >
      <HeroCard
        eyebrow="Teacher & Admin Tool"
        title="Quick Roll Call"
        description="Select a class, mark each learner, and save the session online or queue it offline."
      />

      <Card>
        <OptionChips
          label="Class"
          options={(classesQuery.data ?? []).map((item) => ({
            label: item.name,
            value: item.id,
          }))}
          value={selectedClassId}
          onChange={setSelectedClassId}
        />
        <OptionChips
          label="Subject (optional)"
          options={subjectOptions}
          value={selectedSubjectId}
          onChange={setSelectedSubjectId}
        />
        <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label="Period" value={period} onChangeText={setPeriod} placeholder="Morning" />
      </Card>

      <SectionTitle
        title="Learner Roll Call"
        subtitle="Every learner defaults to Present until changed."
      />
      {studentsQuery.isLoading && !studentsQuery.data ? (
        <LoadingState label="Loading class students..." />
      ) : classStudents.length ? (
        <ScrollView
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {classStudents.map((student) => (
            <Card key={student.id}>
              <Text style={{ fontWeight: "800", color: "#102032" }}>
                {student.user?.name ?? "Student"}
              </Text>
              <Text style={{ color: "#667085" }}>{student.admission_number}</Text>
              <OptionChips
                label="Status"
                options={attendanceStatuses}
                value={statusMap[student.id] ?? "Present"}
                onChange={(value) =>
                  setStatusMap((current) => ({ ...current, [student.id]: value }))
                }
              />
            </Card>
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          title="Select a class"
          description="Choose a class above to load the learners currently cached for attendance."
        />
      )}

      <AppButton
        label={isOnline ? "Save Attendance" : "Queue Attendance"}
        onPress={() => void handleSaveAttendance()}
        loading={recordAttendanceMutation.isPending}
      />

      <SectionTitle
        title="Recent Sessions"
        subtitle="Latest attendance sessions already recorded on the backend."
      />
      {sessionsQuery.isLoading && !sessionsQuery.data ? (
        <LoadingState label="Loading recent sessions..." />
      ) : (sessionsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(sessionsQuery.data?.results ?? []).slice(0, 8).map((session) => (
            <Card key={session.id}>
              <Text style={{ fontWeight: "800", color: "#102032" }}>
                {session.school_class_name || session.student_class || "Class session"}
              </Text>
              <Text style={{ color: "#667085" }}>
                {formatDate(session.date)} • {session.period || "Period not set"}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No sessions yet"
          description="Attendance sessions will appear here once they are created."
        />
      )}
    </Screen>
  );
}
