import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
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
import { isExecutiveRole, isSchoolAdminRole } from "@/features/roles";
import { getApiErrorMessage } from "@/lib/api/errors";
import { announcementsService } from "@/lib/api/services/announcements.service";
import { attendanceService } from "@/lib/api/services/attendance.service";
import { examsService } from "@/lib/api/services/exams.service";
import { feedbackService } from "@/lib/api/services/feedback.service";
import { feesService } from "@/lib/api/services/fees.service";
import { gradesService } from "@/lib/api/services/grades.service";
import { liveClassesService } from "@/lib/api/services/live-classes.service";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { staffRemarksService } from "@/lib/api/services/staff-remarks.service";
import { studentsService } from "@/lib/api/services/students.service";
import { formatDate, formatDateTime, formatMoney, formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";

function openPayloadIfPossible(payload: any) {
  const possibleUrl =
    (typeof payload === "string" && payload.startsWith("http") && payload) ||
    payload?.url ||
    payload?.file_url ||
    payload?.card_url ||
    payload?.pdf_url;

  if (possibleUrl) {
    void Linking.openURL(possibleUrl);
    return true;
  }

  return false;
}

export function FeedbackScreen() {
  const { user } = useAuth();
  const elevated = isExecutiveRole(user?.role) || isSchoolAdminRole(user?.role);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Medium");

  const feedbackQuery = useQuery({
    queryKey: ["feedback", elevated ? "all" : "mine"],
    queryFn: () =>
      elevated
        ? feedbackService.getFeedbacks({ page_size: 40 })
        : feedbackService.getMyFeedbacks({ page_size: 40 }),
  });

  const statsQuery = useQuery({
    queryKey: ["feedback", "stats"],
    queryFn: () => feedbackService.getFeedbackStats(),
    enabled: elevated,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      feedbackService.createFeedback({
        subject: subject.trim(),
        message: message.trim(),
        priority: priority as "Low" | "Medium" | "High" | "Critical",
      }),
    onSuccess: async () => {
      setSubject("");
      setMessage("");
      await feedbackQuery.refetch();
      Alert.alert("Feedback sent", "Your feedback has been submitted successfully.");
    },
    onError: (error) => Alert.alert("Feedback failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Feedback"
      subtitle="Institutional feedback tickets and response history from the shared backend."
    >
      {elevated ? (
        <View style={{ gap: 12 }}>
          <StatCard label="Open Tickets" value={statsQuery.data?.open ?? feedbackQuery.data?.count ?? 0} helper="Current feedback volume visible to this role." />
          <StatCard label="Resolved" value={statsQuery.data?.resolved ?? 0} helper="Feedback items already resolved." tone="success" />
        </View>
      ) : null}

      <Card>
        <SectionTitle title="Send Feedback" subtitle="Create a new ticket from this mobile workspace." />
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What needs attention?" />
        <Field label="Priority" value={priority} onChangeText={setPriority} placeholder="Low, Medium, High, Critical" />
        <Field label="Message" value={message} onChangeText={setMessage} placeholder="Describe the issue or suggestion" multiline />
        <AppButton label="Submit Feedback" onPress={() => createMutation.mutate()} loading={createMutation.isPending} />
      </Card>

      <SectionTitle title="Feedback Registry" subtitle="Latest tickets available to this role." />
      {feedbackQuery.isLoading && !feedbackQuery.data ? (
        <LoadingState label="Loading feedback..." />
      ) : (feedbackQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(feedbackQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "Resolved" ? "success" : "warning"} />
                {entry.priority ? <Tag label={entry.priority} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{entry.subject}</Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>{entry.message}</Text>
              <Text style={{ color: "#667085" }}>{formatDate(entry.created_at)}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No feedback yet" description="Submitted feedback will appear here." />
      )}
    </Screen>
  );
}

export function SubscriptionScreen() {
  const { user } = useAuth();

  const settingsQuery = useQuery({
    queryKey: ["platform", "settings", "subscription"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const paymentsQuery = useQuery({
    queryKey: ["fees", "my-payments", "subscription"],
    queryFn: () => feesService.getMyPayments({ page_size: 25 }),
  });

  const roleFee = settingsQuery.data?.fees?.[user?.role || ""] ?? "0";

  return (
    <Screen
      title="Subscription"
      subtitle="Role-based license status and payment history from the same live platform rules used on web."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="License Status" value={user?.is_license_paid || user?.isLicensePaid ? "Paid" : "Pending"} helper="This status is returned by the authenticated user record." tone={user?.is_license_paid || user?.isLicensePaid ? "success" : "warning"} />
        <StatCard label="Role Fee" value={formatMoney(roleFee)} helper={`Configured for ${formatRole(user?.role)} in platform settings.`} />
      </View>

      <Card>
        <SectionTitle title="Policy Snapshot" subtitle="Current founder-defined subscription policy." />
        <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
          Payment deadline: {settingsQuery.data?.payment_deadline || settingsQuery.data?.paymentDeadline || "Not configured"}
        </Text>
        <Text style={{ color: "#667085", lineHeight: 19 }}>
          Honour roll threshold: {settingsQuery.data?.honour_roll_threshold ?? settingsQuery.data?.honourRollThreshold ?? 15}
        </Text>
      </Card>

      <SectionTitle title="Payment History" subtitle="Recent payments linked to this account." />
      {paymentsQuery.isLoading && !paymentsQuery.data ? (
        <LoadingState label="Loading payment history..." />
      ) : (paymentsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(paymentsQuery.data?.results ?? []).map((payment) => (
            <Card key={payment.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={payment.status} tone={payment.status === "Confirmed" ? "success" : "warning"} />
                <Tag label={payment.payment_method || "Method"} />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {payment.fee_name || payment.fee_structure_detail?.name || "Platform payment"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {formatMoney(payment.amount)} • {formatDate(payment.payment_date)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No payments recorded" description="Confirmed or pending subscription payments will appear here." />
      )}
    </Screen>
  );
}

export function RewardsScreen() {
  const { user } = useAuth();
  const studentRole = user?.role === "STUDENT" || isSchoolAdminRole(user?.role);

  const honourRollQuery = useQuery({
    queryKey: ["students", "honour-roll", user?.role],
    queryFn: () => studentsService.getHonourRoll({ page_size: 40 }),
    enabled: studentRole,
  });

  const remarksQuery = useQuery({
    queryKey: ["staff-remarks", user?.role],
    queryFn: () =>
      isSchoolAdminRole(user?.role)
        ? staffRemarksService.getRemarks({ page_size: 40 })
        : staffRemarksService.getMyRemarks({ page_size: 40 }),
    enabled: !studentRole,
  });

  return (
    <Screen
      title="Academic Reward"
      subtitle="Honour-roll and recognition data available to this role from the shared backend."
    >
      {studentRole ? (
        honourRollQuery.isLoading && !honourRollQuery.data ? (
          <LoadingState label="Loading honour roll..." />
        ) : (honourRollQuery.data?.results ?? []).length ? (
          <View style={{ gap: 12 }}>
            {(honourRollQuery.data?.results ?? []).map((student) => (
              <Card key={student.id}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Tag label={student.student_class || "Student"} />
                  <Tag label="Honour Roll" tone="success" />
                </View>
                <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                  {student.user?.name || "Student"}
                </Text>
                <Text style={{ color: "#667085", lineHeight: 19 }}>
                  Annual average: {Number(student.annual_average ?? 0).toFixed(2)} / 20
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState title="No honour-roll data" description="Recognized learners will appear here once results are available." />
        )
      ) : remarksQuery.isLoading && !remarksQuery.data ? (
        <LoadingState label="Loading recognition notes..." />
      ) : (remarksQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(remarksQuery.data?.results ?? []).map((remark) => (
            <Card key={remark.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {remark.remark_type || "Recognition"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>{remark.text}</Text>
              <Text style={{ color: "#667085" }}>{formatDate(remark.created_at || remark.date)}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No recognition records" description="Professional recognition and remarks will appear here." />
      )}
    </Screen>
  );
}

export function ChildrenScreen() {
  const childrenQuery = useQuery({
    queryKey: ["parent", "children", "screen"],
    queryFn: () => studentsService.getMyChildren({ page_size: 40 }),
  });

  return (
    <Screen
      title="My Children"
      subtitle="Family-linked learners, classes, and academic standing from the backend."
    >
      {childrenQuery.isLoading && !childrenQuery.data ? (
        <LoadingState label="Loading linked children..." />
      ) : (childrenQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(childrenQuery.data?.results ?? []).map((child) => (
            <Card key={child.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={child.student_class || "Student"} />
                {child.is_on_honour_roll ? <Tag label="Honour Roll" tone="success" /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {child.user?.name || "Student"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                Admission number: {child.admission_number}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                Annual average: {Number(child.annual_average ?? 0).toFixed(2)} / 20
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No linked children" description="Children linked by the school will appear here." />
      )}
    </Screen>
  );
}

export function GradesScreen() {
  const { user } = useAuth();
  const gradesQuery = useQuery({
    queryKey: ["grades", "screen", user?.role],
    queryFn: () => gradesService.getGrades({ page_size: 80 }),
  });

  const annualQuery = useQuery({
    queryKey: ["grades", "annual", user?.role],
    queryFn: () => gradesService.getAnnualResults({}),
    enabled: user?.role === "STUDENT" || user?.role === "PARENT",
  });

  const average =
    annualQuery.data?.results?.[0]?.annual_average ?? annualQuery.data?.results?.[0]?.annual_avg ?? 0;

  return (
    <Screen
      title="Report Card"
      subtitle="Recorded marks and academic outcomes visible to this account type."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Recorded Grades" value={gradesQuery.data?.count ?? 0} helper="Marks currently available to this role." />
        {(user?.role === "STUDENT" || user?.role === "PARENT") ? (
          <StatCard label="Average" value={`${Number(average).toFixed(2)} / 20`} helper="Current annual or term average." tone="success" />
        ) : null}
      </View>

      <SectionTitle title="Recent Gradebook Entries" subtitle="Latest marks returned by the grades service." />
      {gradesQuery.isLoading && !gradesQuery.data ? (
        <LoadingState label="Loading grades..." />
      ) : (gradesQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(gradesQuery.data?.results ?? []).map((grade) => (
            <Card key={grade.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {grade.subject?.name || "Subject"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {grade.score}/20 • {grade.sequence?.name || "Sequence"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {grade.student || "Student"} • {formatDate(grade.created_at)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No grades recorded" description="Grades will appear here once assessments are published." />
      )}
    </Screen>
  );
}

export function SchoolSettingsScreen() {
  const queryClient = useQueryClient();
  const schoolQuery = useQuery({
    queryKey: ["schools", "me", "settings"],
    queryFn: () => schoolsService.getMySchool(),
  });

  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [motto, setMotto] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  React.useEffect(() => {
    if (!schoolQuery.data) {
      return;
    }
    setName(schoolQuery.data.name || "");
    setPrincipal(schoolQuery.data.principal || "");
    setMotto(schoolQuery.data.motto || "");
    setPhone(schoolQuery.data.phone || "");
    setEmail(schoolQuery.data.email || "");
  }, [schoolQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      schoolsService.updateSchool(schoolQuery.data?.id || "", {
        name,
        principal,
        motto,
        phone,
        email,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schools", "me"] });
      Alert.alert("School settings updated", "The institution profile has been updated from mobile.");
    },
    onError: (error) => Alert.alert("Save failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Manage Settings"
      subtitle="School identity and contact settings connected to the same backend used on web."
    >
      {schoolQuery.isLoading && !schoolQuery.data ? (
        <LoadingState label="Loading school settings..." />
      ) : (
        <Card>
          <Field label="School Name" value={name} onChangeText={setName} placeholder="School name" />
          <Field label="Principal" value={principal} onChangeText={setPrincipal} placeholder="Principal name" />
          <Field label="Motto" value={motto} onChangeText={setMotto} placeholder="School motto" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="School phone" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="School email" />
          <AppButton label="Save School Settings" onPress={() => updateMutation.mutate()} loading={updateMutation.isPending} />
        </Card>
      )}
    </Screen>
  );
}

export function InsightsScreen() {
  const summaryQuery = useQuery({
    queryKey: ["students", "summary", "insights"],
    queryFn: () => studentsService.getRegistrySummary(),
  });

  const feeSummaryQuery = useQuery({
    queryKey: ["fees", "summary", "insights"],
    queryFn: () => feesService.getSchoolFeeSummary(),
  });

  const attendanceQuery = useQuery({
    queryKey: ["attendance", "records", "insights"],
    queryFn: () => attendanceService.getAttendanceRecords({ limit: 200 }),
  });

  const classesQuery = useQuery({
    queryKey: ["schools", "classes", "insights"],
    queryFn: () => schoolsService.getHierarchyClasses(),
  });

  const attendanceHealth = useMemo(() => {
    const rows = attendanceQuery.data?.results ?? [];
    if (!rows.length) {
      return 0;
    }
    const present = rows.filter((row) => ["Present", "Late", "present", "late"].includes(row.status)).length;
    return Math.round((present / rows.length) * 100);
  }, [attendanceQuery.data?.results]);

  return (
    <Screen
      title="Strategic Insights"
      subtitle="School-wide operational metrics returned by the same backend services used on web."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Active Enrollment" value={summaryQuery.data?.active_enrollment ?? 0} helper="Students actively linked to the school." />
        <StatCard label="Parent Accounts" value={summaryQuery.data?.parent_accounts ?? 0} helper="Parent logins registered in the school." />
        <StatCard label="Total Collected" value={formatMoney(feeSummaryQuery.data?.school_totals?.total_collected)} helper="School-fee revenue recorded so far." tone="success" />
        <StatCard label="Attendance Health" value={`${attendanceHealth}%`} helper="Present and late attendance over recorded rows." />
      </View>

      <SectionTitle title="Class Coverage" subtitle="Hierarchy classes currently visible to the school." />
      {(classesQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(classesQuery.data ?? []).map((row) => (
            <Card key={row.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{row.name}</Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {row.total_students} students • {row.total_subjects} subjects • {row.total_teachers} teachers
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No class insight yet" description="Classes will appear here once the hierarchy is configured." />
      )}
    </Screen>
  );
}

export function IDCardsScreen() {
  const [preview, setPreview] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["students", "id-cards"],
    queryFn: () => studentsService.getStudents({ page_size: 40 }),
  });

  const cardMutation = useMutation({
    mutationFn: (studentId: string) => studentsService.getStudentCard(studentId),
    onSuccess: async (payload) => {
      if (openPayloadIfPossible(payload)) {
        return;
      }

      const summary =
        typeof payload === "string"
          ? payload.slice(0, 240)
          : Object.entries(payload ?? {})
              .slice(0, 6)
              .map(([key, value]) => `${key}: ${String(value)}`)
              .join("\n");
      setPreview(summary || "Card payload received from backend.");
    },
    onError: (error) => Alert.alert("Could not load card", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="ID Cards"
      subtitle="Student identity card access from the backend student-card generator."
    >
      {preview ? (
        <Card>
          <SectionTitle title="Latest Card Payload" subtitle="Most recent data returned by the backend card generator." />
          <Text style={{ color: "#667085", lineHeight: 20 }}>{preview}</Text>
        </Card>
      ) : null}

      {studentsQuery.isLoading && !studentsQuery.data ? (
        <LoadingState label="Loading students..." />
      ) : (studentsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(studentsQuery.data?.results ?? []).map((student) => (
            <Card key={student.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {student.user?.name || "Student"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {student.student_class} • {student.admission_number}
              </Text>
              <AppButton
                label="Open Student Card"
                variant="secondary"
                onPress={() => cardMutation.mutate(student.id)}
                loading={cardMutation.isPending}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No students found" description="Student card generation needs registered learners." />
      )}
    </Screen>
  );
}

export function TranscriptsScreen() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["students", "transcripts"],
    queryFn: () => studentsService.getStudents({ page_size: 25 }),
  });

  const sequencesQuery = useQuery({
    queryKey: ["grades", "sequences", "transcripts"],
    queryFn: () => gradesService.getSequences({ is_active: true, page_size: 10 }),
  });

  const activeSequence = sequencesQuery.data?.results?.[0];

  const reportCardQuery = useQuery({
    queryKey: ["grades", "report-card", selectedStudentId, activeSequence?.id],
    queryFn: () => gradesService.getReportCard(selectedStudentId || "", activeSequence?.id || ""),
    enabled: Boolean(selectedStudentId && activeSequence?.id),
  });

  return (
    <Screen
      title="Transcripts"
      subtitle="Report-card data and student transcript visibility from the grades backend."
    >
      <Card>
        <SectionTitle title="Active Sequence" subtitle="The current grading sequence used for transcript previews." />
        <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
          {activeSequence?.name || "No active sequence found"}
        </Text>
      </Card>

      {reportCardQuery.data ? (
        <Card>
          <SectionTitle title="Report Card Preview" subtitle="Current student result summary." />
          <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
            Average: {Number(reportCardQuery.data.average ?? 0).toFixed(2)} / 20
          </Text>
          <Text style={{ color: "#667085", lineHeight: 19 }}>
            Rank: {reportCardQuery.data.rank} / {reportCardQuery.data.total_students}
          </Text>
          <Text style={{ color: "#667085", lineHeight: 19 }}>
            Recorded grades: {reportCardQuery.data.grades?.length ?? 0}
          </Text>
        </Card>
      ) : null}

      <SectionTitle title="Student Transcript Access" subtitle="Select a learner to load the active report-card data." />
      {studentsQuery.isLoading && !studentsQuery.data ? (
        <LoadingState label="Loading students..." />
      ) : (studentsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(studentsQuery.data?.results ?? []).map((student) => (
            <Card key={student.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {student.user?.name || "Student"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {student.student_class} • {student.admission_number}
              </Text>
              <AppButton
                label="Load Transcript Preview"
                variant="secondary"
                onPress={() => setSelectedStudentId(student.id)}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No students found" description="Transcript previews require registered learners." />
      )}
    </Screen>
  );
}

export function ScheduleScreen() {
  const liveClassesQuery = useQuery({
    queryKey: ["schedule", "live-classes"],
    queryFn: () => liveClassesService.getUpcoming(),
  });

  const examsQuery = useQuery({
    queryKey: ["schedule", "exams"],
    queryFn: () => examsService.getExams({ page_size: 20 }),
  });

  const attendanceSessionsQuery = useQuery({
    queryKey: ["schedule", "attendance-sessions"],
    queryFn: () => attendanceService.getAttendanceSessions({ page_size: 20 }),
  });

  return (
    <Screen
      title="Schedule"
      subtitle="Upcoming live classes, exams, and attendance periods visible to this teaching account."
    >
      <SectionTitle title="Upcoming Live Classes" subtitle="Backend sessions scheduled in the near future." />
      {(liveClassesQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(liveClassesQuery.data?.results ?? []).map((session) => (
            <Card key={session.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{session.title}</Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {session.target_class} • {formatDateTime(session.start_time)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No live classes scheduled" description="Upcoming live classes will appear here." />
      )}

      <SectionTitle title="Exams" subtitle="Assessment windows visible from the exams service." />
      {(examsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(examsQuery.data?.results ?? []).map((exam) => (
            <Card key={exam.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{exam.title}</Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {exam.target_class} • {formatDateTime(exam.start_time)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No exams scheduled" description="Exam sessions will appear here once published." />
      )}

      <SectionTitle title="Attendance Periods" subtitle="Latest attendance sessions visible to this account." />
      {(attendanceSessionsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(attendanceSessionsQuery.data?.results ?? []).map((session) => (
            <Card key={session.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {session.student_class || session.class_name || "Class session"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {formatDate(session.date)} • {session.period || "No period set"}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No attendance periods" description="Attendance sessions will appear here once recorded." />
      )}
    </Screen>
  );
}
