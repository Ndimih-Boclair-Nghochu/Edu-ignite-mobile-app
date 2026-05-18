import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  HeroCard,
  LoadingState,
  ModalSheet,
  OptionChips,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { schoolsService } from "@/lib/api/services/schools.service";
import { studentsService } from "@/lib/api/services/students.service";
import { usersService } from "@/lib/api/services/users.service";
import { CreateStudentRequest } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { buildSchoolStudentRoster } from "@/lib/school-student-roster";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const genderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
] as const;

type StudentFormState = {
  name: string;
  email: string;
  gender: "male" | "female" | "other";
  guardian_name: string;
  guardian_phone: string;
  student_class: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
};

const defaultForm: StudentFormState = {
  name: "",
  email: "",
  gender: "male",
  guardian_name: "",
  guardian_phone: "",
  student_class: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
};

export function StudentsScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(defaultForm);

  const canCreate = user?.role === "SCHOOL_ADMIN" || user?.role === "SUB_ADMIN";

  const summaryQuery = useQuery({
    queryKey: queryKeys.students.summary,
    queryFn: () => studentsService.getRegistrySummary(),
    enabled: Boolean(user),
  });

  const studentsQuery = useQuery({
    queryKey: queryKeys.students.list({ page_size: 500 }),
    queryFn: () => studentsService.getStudents({ page_size: 500 }),
    enabled: Boolean(user),
  });

  const honourRollQuery = useQuery({
    queryKey: queryKeys.students.honourRoll,
    queryFn: () => studentsService.getHonourRoll({ page_size: 50 }),
    enabled: Boolean(user),
  });

  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes(),
    queryFn: () => schoolsService.getHierarchyClasses(),
    enabled: Boolean(user),
  });

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const studentUsersQuery = useQuery({
    queryKey: ["users", "school", schoolId, "students"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: "STUDENT",
        ordering: "name",
        page_size: 500,
      }),
    enabled: Boolean(schoolId),
  });

  const parentsQuery = useQuery({
    queryKey: ["users", "school", schoolId, "parents"],
    queryFn: () =>
      usersService.getUsers({
        role: "PARENT",
        school_id: schoolId,
        ordering: "name",
        page_size: 500,
      }),
    enabled: Boolean(schoolId),
  });

  const createStudentMutation = useMutation({
    mutationFn: (payload: Parameters<typeof studentsService.createStudent>[0]) =>
      studentsService.createStudent(payload),
    onSuccess: async () => {
      setForm(defaultForm);
      setSelectedClassId(null);
      setFormOpen(false);
      await Promise.all([
        studentsQuery.refetch(),
        studentUsersQuery.refetch(),
        parentsQuery.refetch(),
        summaryQuery.refetch(),
        honourRollQuery.refetch(),
      ]);
      Alert.alert("Student registered", "The learner has been created on the live backend.");
    },
    onError: (error) => {
      Alert.alert("Could not create student", getApiErrorMessage(error));
    },
  });

  const selectedClass = useMemo(
    () => (classesQuery.data ?? []).find((item) => item.id === selectedClassId) ?? null,
    [classesQuery.data, selectedClassId]
  );

  const registryCards = useMemo(
    () => buildSchoolStudentRoster(studentsQuery.data?.results ?? [], studentUsersQuery.data?.results ?? []),
    [studentUsersQuery.data?.results, studentsQuery.data?.results]
  );

  const filteredStudents = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) {
      return registryCards;
    }

    return registryCards.filter((student) =>
      `${student.user?.name ?? ""} ${student.user?.email ?? ""} ${student.admissionNumber ?? ""} ${student.user?.matricule ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [deferredSearch, registryCards]);

  const honourLearners = honourRollQuery.data?.results ?? [];
  const activeEnrollment = Math.max(
    Number(summaryQuery.data?.active_enrollment || 0),
    Number(summaryQuery.data?.student_profiles || 0),
    studentsQuery.data?.count ?? 0,
    studentsQuery.data?.results?.length ?? 0,
    studentUsersQuery.data?.count ?? 0,
    studentUsersQuery.data?.results?.length ?? 0,
    Number(schoolQuery.data?.student_count || 0)
  );
  const parentAccounts = Math.max(
    Number(summaryQuery.data?.parent_accounts || 0),
    parentsQuery.data?.count ?? 0,
    parentsQuery.data?.results?.length ?? 0
  );
  const linkedStudents = Math.max(
    Number(summaryQuery.data?.students_linked || 0),
    (studentsQuery.data?.results ?? []).filter((entry) => (entry.parent_count ?? 0) > 0).length
  );
  const honourCount = Math.max(
    Number(summaryQuery.data?.honour_roll_count || 0),
    honourLearners.length
  );

  async function handleCreateStudent() {
    const className = selectedClass?.name ?? form.student_class.trim();

    if (!form.name.trim() || !className.trim()) {
      Alert.alert("Missing details", "Student name and class are required.");
      return;
    }

    const payload: CreateStudentRequest = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      gender: form.gender,
      school_class: selectedClass?.id ?? null,
      student_class: className.trim(),
      class_level: className.trim(),
      section: selectedClass?.sub_school_name ?? schoolQuery.data?.short_name ?? "General",
      guardian_name: form.guardian_name.trim(),
      guardian_phone: form.guardian_phone.trim(),
      parent_name: form.parent_name.trim(),
      parent_email: form.parent_email.trim(),
      parent_phone: form.parent_phone.trim(),
      parent_relationship: "guardian",
      create_parent_account: Boolean(
        form.parent_name.trim() && (form.parent_email.trim() || form.parent_phone.trim())
      ),
    };

    if (!isOnline) {
      await enqueue("CREATE_STUDENT", payload, `Register student ${form.name.trim()}`);
      setForm(defaultForm);
      setSelectedClassId(null);
      setFormOpen(false);
      Alert.alert("Student saved", "The student registration has been recorded.");
      return;
    }

    createStudentMutation.mutate(payload);
  }

  return (
    <Screen
      title="Students"
      subtitle="Admissions, guardian links, parent onboarding, and honour-roll visibility."
      rightAction={canCreate ? <AppButton compact label="Register" onPress={() => setFormOpen(true)} /> : undefined}
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? "Student Registry"}
        title={schoolQuery.data?.name ?? "School student registry"}
        description="Keep the learner registry clean, school-scoped, and ready for parent linkage across the shared institution workspace."
      />

      <View style={{ gap: 12 }}>
        <StatCard label="Active Enrollment" value={activeEnrollment} helper="Students linked to this school." />
        <StatCard label="Parent Accounts" value={parentAccounts} helper="Parent logins inside the same school scope." />
        <StatCard label="Students Linked" value={linkedStudents} helper="Learners already tied to at least one parent." tone="success" />
        <StatCard label="Honour Roll" value={honourCount} helper="Learners above the honour threshold." />
      </View>

      <Field
        label="Search Learners"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, email, matricule, or admission number"
      />

      <SectionTitle title="Student Registry" subtitle="All learners currently visible inside this school." />
      {studentsQuery.isLoading && studentUsersQuery.isLoading && !filteredStudents.length ? (
        <LoadingState label="Loading student registry..." />
      ) : filteredStudents.length ? (
        <View style={{ gap: 12 }}>
          {filteredStudents.map((student) => (
            <Card key={student.key}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {student.user?.name ?? "Student"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    {student.user?.matricule || "No matricule yet"} • {student.admissionNumber}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    {student.studentClass} • Guardian: {student.guardianName}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    Admission date: {formatDate(student.admissionDate)}
                  </Text>
                </View>
                <View style={{ gap: 8, alignItems: "flex-end" }}>
                  <Tag label={`${student.parentCount ?? 0} parent`} />
                  {!student.hasProfile ? <Tag label="Profile Pending" tone="warning" /> : null}
                  {student.isOnHonourRoll ? <Tag label="Honour" tone="success" /> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No students found"
          description="The current registry does not contain any learner matching this search."
        />
      )}

      <SectionTitle
        title="Honour Roll Snapshot"
        subtitle="A quick look at the learners currently meeting the school threshold."
      />
      {honourRollQuery.isLoading && !honourRollQuery.data ? (
        <LoadingState label="Loading honour-roll students..." />
      ) : honourLearners.length ? (
        <View style={{ gap: 12 }}>
          {honourLearners.slice(0, 5).map((student) => (
            <Card key={student.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                {student.user?.name}
              </Text>
              <Text style={{ color: "#667085" }}>
                {student.student_class} • {student.admission_number}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No honour-roll learners yet"
          description="No learner currently meets the school honour threshold."
        />
      )}

      <ModalSheet visible={formOpen} title="Register Student" onClose={() => setFormOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field
            label="Full Name"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Enter learner full name"
          />
          <Field
            label="Email (optional)"
            value={form.email}
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="Temporary email can be auto-generated by backend"
          />
          <OptionChips
            label="Gender"
            options={[...genderOptions]}
            value={form.gender}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                gender: value as StudentFormState["gender"],
              }))
            }
          />
          <OptionChips
            label="Class"
            options={(classesQuery.data ?? []).map((item) => ({
              label: item.sub_school_name ? `${item.name} - ${item.sub_school_name}` : item.name,
              value: item.id,
            }))}
            value={selectedClassId}
            onChange={(value) => {
              setSelectedClassId(value);
              const nextClass = (classesQuery.data ?? []).find((item) => item.id === value);
              setForm((current) => ({ ...current, student_class: nextClass?.name ?? current.student_class }));
            }}
          />
          {!selectedClass ? (
            <Field
              label="Class Name"
              value={form.student_class}
              onChangeText={(value) => setForm((current) => ({ ...current, student_class: value }))}
              placeholder="e.g. Form 4 Science"
            />
          ) : null}
          <Field
            label="Guardian Name"
            value={form.guardian_name}
            onChangeText={(value) => setForm((current) => ({ ...current, guardian_name: value }))}
            placeholder="Primary guardian or caretaker"
          />
          <Field
            label="Guardian Phone"
            value={form.guardian_phone}
            onChangeText={(value) => setForm((current) => ({ ...current, guardian_phone: value }))}
            placeholder="Guardian contact number"
          />
          <Field
            label="Parent Name (optional)"
            value={form.parent_name}
            onChangeText={(value) => setForm((current) => ({ ...current, parent_name: value }))}
            placeholder="Parent account holder"
          />
          <Field
            label="Parent Email (optional)"
            value={form.parent_email}
            onChangeText={(value) => setForm((current) => ({ ...current, parent_email: value }))}
            placeholder="Parent email"
          />
          <Field
            label="Parent Phone (optional)"
            value={form.parent_phone}
            onChangeText={(value) => setForm((current) => ({ ...current, parent_phone: value }))}
            placeholder="Parent phone"
          />
          <AppButton
            label="Create Student"
            onPress={() => void handleCreateStudent()}
            loading={createStudentMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
