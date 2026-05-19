import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Image, Linking, Text, View } from "react-native";
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
  UserAvatar,
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
import { usersService } from "@/lib/api/services/users.service";
import { pickImageUpload } from "@/lib/uploads";
import {
  buildSchoolStudentRoster,
  SchoolStudentRosterRow,
  studentRosterMatchesClass,
} from "@/lib/school-student-roster";
import { formatDate, formatDateTime, formatMoney, formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";
import { palette } from "@/theme";

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
  const { enqueue, isOnline } = useSync();
  const isTeacher = user?.role === "TEACHER";
  const [gradeOpen, setGradeOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");

  const gradesQuery = useQuery({
    queryKey: ["grades", "screen", user?.role],
    queryFn: () => gradesService.getGrades({ page_size: 80 }),
  });

  const annualQuery = useQuery({
    queryKey: ["grades", "annual", user?.role],
    queryFn: () => gradesService.getAnnualResults({}),
    enabled: user?.role === "STUDENT" || user?.role === "PARENT",
  });

  const studentsQuery = useQuery({
    queryKey: ["grades", "teacher-students"],
    queryFn: () => studentsService.getStudents({ page_size: 500 }),
    enabled: isTeacher,
  });

  const sequencesQuery = useQuery({
    queryKey: ["grades", "teacher-sequences"],
    queryFn: () => gradesService.getSequences({ page_size: 80 }),
    enabled: isTeacher,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["grades", "teacher-enrollments"],
    queryFn: () => gradesService.getStudentSubjectEnrollments({ page_size: 500 }),
    enabled: isTeacher,
  });

  const average =
    annualQuery.data?.results?.[0]?.annual_average ?? annualQuery.data?.results?.[0]?.annual_avg ?? 0;

  const teacherStudentOptions = useMemo(() => {
    const linkedStudentIds = new Set((enrollmentsQuery.data?.results ?? []).map((entry) => entry.student));
    return (studentsQuery.data?.results ?? [])
      .filter((student) => linkedStudentIds.size === 0 || linkedStudentIds.has(student.id))
      .map((student) => ({
        label: `${student.user?.name || "Student"} (${student.student_class || student.school_class_name || "Class"})`,
        value: student.id,
      }));
  }, [enrollmentsQuery.data?.results, studentsQuery.data?.results]);

  const subjectOptions = useMemo(() => {
    const rows = (enrollmentsQuery.data?.results ?? []).filter(
      (entry) => !selectedStudentId || entry.student === selectedStudentId
    );
    const unique = new Map<string, string>();
    rows.forEach((entry) => unique.set(entry.subject, entry.subject_name));
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [enrollmentsQuery.data?.results, selectedStudentId]);

  const createGradeMutation = useMutation({
    mutationFn: () => {
      if (!selectedStudentId || !selectedSubjectId || !selectedSequenceId) {
        throw new Error("Student, subject, and sequence are required.");
      }
      return gradesService.createGrade({
        student: selectedStudentId,
        subject: selectedSubjectId,
        sequence: selectedSequenceId,
        score: Number.parseFloat(score),
        comment: comment.trim(),
      });
    },
    onSuccess: async () => {
      setGradeOpen(false);
      setSelectedStudentId(null);
      setSelectedSubjectId(null);
      setSelectedSequenceId(null);
      setScore("");
      setComment("");
      await gradesQuery.refetch();
      Alert.alert("Grade saved", "The mark has been recorded.");
    },
    onError: (error) => Alert.alert("Grade save failed", getApiErrorMessage(error)),
  });

  async function handleCreateGrade() {
    const numericScore = Number.parseFloat(score);
    if (!selectedStudentId || !selectedSubjectId || !selectedSequenceId || !Number.isFinite(numericScore)) {
      Alert.alert("Missing details", "Select a student, subject, sequence, and valid score.");
      return;
    }

    const payload = {
      student: selectedStudentId,
      subject: selectedSubjectId,
      sequence: selectedSequenceId,
      score: numericScore,
      comment: comment.trim(),
    };

    if (!isOnline) {
      await enqueue("CREATE_GRADE", payload, "Create grade");
      setGradeOpen(false);
      setSelectedStudentId(null);
      setSelectedSubjectId(null);
      setSelectedSequenceId(null);
      setScore("");
      setComment("");
      Alert.alert("Grade saved", "The mark has been recorded.");
      return;
    }

    createGradeMutation.mutate();
  }

  return (
    <Screen
      title="Report Card"
      subtitle={isTeacher ? "Record marks and review gradebook entries." : "Recorded marks and academic outcomes visible to this account type."}
      rightAction={isTeacher ? <AppButton compact label="Add Mark" onPress={() => setGradeOpen(true)} /> : undefined}
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
                {(grade as any).subject_name || grade.subject?.name || "Subject"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {grade.score}/20 - {grade.sequence?.name || "Sequence"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 19 }}>
                {(grade as any).student_name || grade.student || "Student"} - {formatDate(grade.created_at)}
              </Text>
              {grade.comment ? <Text style={{ color: "#667085", lineHeight: 19 }}>{grade.comment}</Text> : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No grades recorded" description="Grades will appear here once assessments are published." />
      )}

      <ModalSheet visible={gradeOpen} title="Add Mark" onClose={() => setGradeOpen(false)}>
        <View style={{ gap: 16 }}>
          <OptionChips
            label="Student"
            options={teacherStudentOptions}
            value={selectedStudentId}
            onChange={(value) => {
              setSelectedStudentId(value);
              setSelectedSubjectId(null);
            }}
          />
          <OptionChips
            label="Subject"
            options={subjectOptions}
            value={selectedSubjectId}
            onChange={setSelectedSubjectId}
          />
          <OptionChips
            label="Sequence"
            options={(sequencesQuery.data?.results ?? []).map((entry) => ({ label: entry.name, value: entry.id }))}
            value={selectedSequenceId}
            onChange={setSelectedSequenceId}
          />
          <Field label="Score" value={score} onChangeText={setScore} keyboardType="numeric" placeholder="Score out of 20" />
          <Field label="Comment" value={comment} onChangeText={setComment} placeholder="Teacher comment" multiline />
          <AppButton label="Save Mark" onPress={() => void handleCreateGrade()} loading={createGradeMutation.isPending} />
        </View>
      </ModalSheet>
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
  const [shortName, setShortName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [division, setDivision] = useState("");
  const [subDivision, setSubDivision] = useState("");
  const [cityVillage, setCityVillage] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  React.useEffect(() => {
    if (!schoolQuery.data) {
      return;
    }
    setName(schoolQuery.data.name || "");
    setShortName(schoolQuery.data.short_name || schoolQuery.data.shortName || "");
    setPrincipal(schoolQuery.data.principal || "");
    setMotto(schoolQuery.data.motto || "");
    setDescription(schoolQuery.data.description || "");
    setRegion(schoolQuery.data.region || "");
    setDivision(schoolQuery.data.division || "");
    setSubDivision(schoolQuery.data.sub_division || schoolQuery.data.subDivision || "");
    setCityVillage(schoolQuery.data.city_village || schoolQuery.data.cityVillage || "");
    setAddress(schoolQuery.data.address || "");
    setPhone(schoolQuery.data.phone || "");
    setEmail(schoolQuery.data.email || "");
  }, [schoolQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      schoolsService.updateSchool(schoolQuery.data?.id || "", {
        name,
        short_name: shortName,
        principal,
        motto,
        description,
        region,
        division,
        sub_division: subDivision,
        city_village: cityVillage,
        address,
        location: [cityVillage, region].filter(Boolean).join(", "),
        phone,
        email,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schools", "me"] });
      Alert.alert("School settings updated", "The institution profile has been updated from mobile.");
    },
    onError: (error) => Alert.alert("Save failed", getApiErrorMessage(error)),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async () => {
      if (!schoolQuery.data?.id) {
        throw new Error("School not found.");
      }
      const file = await pickImageUpload({ aspect: [1, 1], quality: 0.9 });
      if (!file) {
        return null;
      }
      return schoolsService.uploadLogo(schoolQuery.data.id, file);
    },
    onSuccess: async (payload) => {
      if (!payload) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["schools", "me"] });
      Alert.alert("Logo updated", "The school logo has been updated.");
    },
    onError: (error) => Alert.alert("Upload failed", getApiErrorMessage(error)),
  });

  const uploadBannerMutation = useMutation({
    mutationFn: async () => {
      if (!schoolQuery.data?.id) {
        throw new Error("School not found.");
      }
      const file = await pickImageUpload({ aspect: [16, 9], quality: 0.9 });
      if (!file) {
        return null;
      }
      return schoolsService.uploadBanner(schoolQuery.data.id, file);
    },
    onSuccess: async (payload) => {
      if (!payload) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["schools", "me"] });
      Alert.alert("Banner updated", "The school banner has been updated.");
    },
    onError: (error) => Alert.alert("Upload failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Manage Settings"
      subtitle="Institution profile"
    >
      {schoolQuery.isLoading && !schoolQuery.data ? (
        <LoadingState label="Loading school settings..." />
      ) : (
        <View style={{ gap: 16 }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <UserAvatar
                name={schoolQuery.data?.name}
                uri={schoolQuery.data?.logo}
                size={78}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "900", fontSize: 20, color: palette.text }}>
                  {schoolQuery.data?.name || "School"}
                </Text>
                <Text style={{ color: palette.textMuted }}>
                  {schoolQuery.data?.short_name || schoolQuery.data?.shortName || "No short name"}
                </Text>
              </View>
            </View>
            <AppButton
              label="Update Logo"
              variant="secondary"
              onPress={() => uploadLogoMutation.mutate()}
              loading={uploadLogoMutation.isPending}
            />
            <AppButton
              label="Update Banner"
              variant="ghost"
              onPress={() => uploadBannerMutation.mutate()}
              loading={uploadBannerMutation.isPending}
            />
          </Card>

          <Card>
            <SectionTitle title="Institution Identity" />
            <Field label="School Name" value={name} onChangeText={setName} placeholder="School name" />
            <Field label="Short Name" value={shortName} onChangeText={setShortName} placeholder="GBHS P" />
            <Field label="Principal" value={principal} onChangeText={setPrincipal} placeholder="Principal name" />
            <Field label="Motto" value={motto} onChangeText={setMotto} placeholder="School motto" />
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Institution description" multiline />
          </Card>

          <Card>
            <SectionTitle title="Registry & Contact" />
            <Field label="Region" value={region} onChangeText={setRegion} placeholder="Region" />
            <Field label="Division" value={division} onChangeText={setDivision} placeholder="Division" />
            <Field label="Sub Division" value={subDivision} onChangeText={setSubDivision} placeholder="Sub division" />
            <Field label="City / Village" value={cityVillage} onChangeText={setCityVillage} placeholder="City or village" />
            <Field label="Address" value={address} onChangeText={setAddress} placeholder="Street address" multiline />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="School phone" keyboardType="phone-pad" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="School email" keyboardType="email-address" autoCapitalize="none" />
            <AppButton
              label="Save School Settings"
              onPress={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
            />
          </Card>
        </View>
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
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [previewRow, setPreviewRow] = useState<SchoolStudentRosterRow | null>(null);
  const [previewPayload, setPreviewPayload] = useState<any | null>(null);

  const schoolQuery = useQuery({
    queryKey: ["schools", "me", "id-cards"],
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const studentsQuery = useQuery({
    queryKey: ["students", "id-cards", "profiles"],
    queryFn: () => studentsService.getStudents({ page_size: 500, ordering: "user__name" }),
    enabled: Boolean(user),
  });

  const studentUsersQuery = useQuery({
    queryKey: ["users", "school", schoolId, "id-card-students"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: "STUDENT",
        ordering: "name",
        page_size: 500,
      }),
    enabled: Boolean(schoolId),
  });

  const classesQuery = useQuery({
    queryKey: ["schools", "classes", "id-cards", schoolId],
    queryFn: () => schoolsService.getHierarchyClasses({ school_id: schoolId || undefined }),
    enabled: Boolean(user),
  });

  const platformSettingsQuery = useQuery({
    queryKey: ["platform", "settings", "id-cards"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const cardMutation = useMutation({
    mutationFn: (row: SchoolStudentRosterRow) =>
      row.profileId ? studentsService.getStudentCard(row.profileId) : Promise.resolve(null),
    onSuccess: async (payload, row) => {
      setPreviewRow(row);
      setPreviewPayload(payload);
      openPayloadIfPossible(payload);
    },
    onError: (error) => Alert.alert("Could not load card", getApiErrorMessage(error)),
  });

  const roster = useMemo(
    () => buildSchoolStudentRoster(studentsQuery.data?.results ?? [], studentUsersQuery.data?.results ?? []),
    [studentUsersQuery.data?.results, studentsQuery.data?.results]
  );

  const selectedClass = useMemo(
    () => (classesQuery.data ?? []).find((entry) => entry.id === selectedClassId) ?? null,
    [classesQuery.data, selectedClassId]
  );

  const filteredStudents = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return roster.filter((row) => {
      const classMatch =
        selectedClassId === "all" ||
        studentRosterMatchesClass(row, selectedClassId, selectedClass?.name);
      const searchMatch =
        !keyword ||
        `${row.name} ${row.matricule} ${row.admissionNumber} ${row.studentClass}`
          .toLowerCase()
          .includes(keyword);
      return classMatch && searchMatch;
    });
  }, [deferredSearch, roster, selectedClass?.name, selectedClassId]);

  const readyCards = roster.filter((row) => row.hasProfile).length;
  const pendingProfiles = Math.max(roster.length - readyCards, 0);

  return (
    <Screen
      title="ID Cards"
      subtitle="Student identity cards from the live school registry."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Students" value={roster.length} helper="Student accounts and profiles visible to this school." />
        <StatCard label="Ready Cards" value={readyCards} helper="Learners with complete student profiles." tone="success" />
        <StatCard label="Profile Pending" value={pendingProfiles} helper="Student accounts still missing full admission profiles." tone="warning" />
      </View>

      <Card>
        <SectionTitle title="Filters" subtitle="Search or narrow card generation by class." />
        <Field
          label="Search Student"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, matricule, class, or admission number"
        />
        <OptionChips
          label="Class"
          options={[
            { label: "All classes", value: "all" },
            ...(classesQuery.data ?? []).map((entry) => ({
              label: entry.sub_school_name ? `${entry.name} - ${entry.sub_school_name}` : entry.name,
              value: entry.id,
            })),
          ]}
          value={selectedClassId}
          onChange={setSelectedClassId}
        />
      </Card>

      {previewRow ? (
        <Card>
          <SectionTitle title="ID Card Preview" subtitle={previewRow.hasProfile ? "Official student profile" : "Student profile pending"} />
          <View
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(38,77,115,0.16)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <View style={{ backgroundColor: palette.primary, padding: 14, gap: 4 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12, textTransform: "uppercase" }}>
                Student ID Card
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.82)", fontWeight: "700" }}>
                {schoolQuery.data?.name || user?.school?.name || "School"}
              </Text>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <UserAvatar name={previewRow.name} uri={previewRow.avatar} size={72} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: palette.text, fontSize: 18 }}>
                    {previewRow.name}
                  </Text>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    {previewRow.matricule || "Matricule pending"}
                  </Text>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    {previewRow.studentClass}
                  </Text>
                </View>
                {schoolQuery.data?.logo || user?.school?.logo ? (
                  <UserAvatar
                    name={schoolQuery.data?.name || user?.school?.name}
                    uri={schoolQuery.data?.logo || user?.school?.logo}
                    size={52}
                  />
                ) : null}
              </View>

              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {previewPayload?.qr_code ? (
                  <Image
                    source={{ uri: previewPayload.qr_code }}
                    style={{ width: 82, height: 82, borderRadius: 10, backgroundColor: "#FFFFFF" }}
                    resizeMode="contain"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    Admission: {previewRow.admissionNumber}
                  </Text>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    Guardian: {previewRow.guardianName || "Pending"}
                  </Text>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    Powered by {platformSettingsQuery.data?.name || "EduIgnite"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <AppButton compact label="Close Preview" variant="ghost" onPress={() => setPreviewRow(null)} />
        </Card>
      ) : null}

      {studentsQuery.isLoading && studentUsersQuery.isLoading && !roster.length ? (
        <LoadingState label="Loading students..." />
      ) : filteredStudents.length ? (
        <View style={{ gap: 12 }}>
          {filteredStudents.map((student) => (
            <Card key={student.key}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar name={student.name} uri={student.avatar} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {student.name}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    {student.studentClass} - {student.admissionNumber}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <Tag label={student.hasProfile ? "Ready" : "Profile Pending"} tone={student.hasProfile ? "success" : "warning"} />
                    {student.matricule ? <Tag label={student.matricule} /> : null}
                  </View>
                </View>
              </View>
              <AppButton
                label="Preview ID Card"
                variant="secondary"
                onPress={() => cardMutation.mutate(student)}
                loading={cardMutation.isPending}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No students found" description="No learner matches the current ID-card filters." />
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
