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
  PasswordField,
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

const relationshipOptions = [
  { label: "Father", value: "father" },
  { label: "Mother", value: "mother" },
  { label: "Guardian", value: "guardian" },
  { label: "Other", value: "other" },
] as const;

type StudentFormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  password: string;
  gender: "male" | "female" | "other";
  guardian_name: string;
  guardian_phone: string;
  guardian_whatsapp: string;
  student_class: string;
  class_level: string;
  section: string;
  date_of_birth: string;
  admission_number: string;
  admission_date: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_whatsapp: string;
  parent_relationship: string;
  create_parent_account: boolean;
};

const defaultForm: StudentFormState = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  password: "",
  gender: "male",
  guardian_name: "",
  guardian_phone: "",
  guardian_whatsapp: "",
  student_class: "",
  class_level: "",
  section: "",
  date_of_birth: "",
  admission_number: "",
  admission_date: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  parent_whatsapp: "",
  parent_relationship: "guardian",
  create_parent_account: false,
};

export function StudentsScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubSchoolId, setSelectedSubSchoolId] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
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

  const subSchoolsQuery = useQuery({
    queryKey: queryKeys.schools.subSchools,
    queryFn: () => schoolsService.getSubSchools(),
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
      setSelectedSubSchoolId(null);
      setShowOptionalFields(false);
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

  const selectedSubSchool = useMemo(
    () => (subSchoolsQuery.data ?? []).find((item) => item.id === selectedSubSchoolId) ?? null,
    [selectedSubSchoolId, subSchoolsQuery.data]
  );

  const admissionClassOptions = useMemo(
    () =>
      (classesQuery.data ?? []).filter(
        (item) => !selectedSubSchoolId || item.sub_school === selectedSubSchoolId
      ),
    [classesQuery.data, selectedSubSchoolId]
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
    const sectionName =
      selectedClass?.sub_school_name ||
      selectedSubSchool?.name ||
      form.section.trim() ||
      schoolQuery.data?.short_name ||
      "General";

    if (!form.name.trim() || !className.trim()) {
      Alert.alert("Missing details", "Student name and class are required.");
      return;
    }

    if (form.create_parent_account && !(form.parent_name.trim() || form.guardian_name.trim())) {
      Alert.alert("Missing parent name", "Enter a parent name or guardian name before creating a parent account.");
      return;
    }

    const payload: CreateStudentRequest = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      password: form.password.trim() || undefined,
      gender: form.gender,
      school_class: selectedClass?.id ?? null,
      student_class: className.trim(),
      class_level: form.class_level.trim() || className.trim(),
      section: sectionName,
      date_of_birth: form.date_of_birth.trim() || undefined,
      guardian_name: form.guardian_name.trim(),
      guardian_phone: form.guardian_phone.trim(),
      guardian_whatsapp: form.guardian_whatsapp.trim(),
      admission_number: form.admission_number.trim() || undefined,
      admission_date: form.admission_date.trim() || undefined,
      parent_name: form.parent_name.trim(),
      parent_email: form.parent_email.trim(),
      parent_phone: form.parent_phone.trim(),
      parent_whatsapp: form.parent_whatsapp.trim(),
      parent_relationship: form.parent_relationship,
      create_parent_account: form.create_parent_account,
    };

    if (!isOnline) {
      await enqueue("CREATE_STUDENT", payload, `Register student ${form.name.trim()}`);
      setForm(defaultForm);
      setSelectedClassId(null);
      setSelectedSubSchoolId(null);
      setShowOptionalFields(false);
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
          <SectionTitle title="Learner Identity" subtitle="Essential admission details." />
          <Field
            label="Full Name"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Enter learner full name"
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

          <SectionTitle title="Admission Placement" subtitle="Place the learner into the real school hierarchy." />
          <OptionChips
            label="Sub School"
            options={[
              { label: "General", value: "all" },
              ...(subSchoolsQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })),
            ]}
            value={selectedSubSchoolId ?? "all"}
            onChange={(value) => {
              const nextSubSchoolId = value === "all" ? null : value;
              setSelectedSubSchoolId(nextSubSchoolId);
              const nextSubSchool = (subSchoolsQuery.data ?? []).find((item) => item.id === nextSubSchoolId);
              setForm((current) => ({
                ...current,
                section: nextSubSchool?.name ?? current.section,
              }));
              if (selectedClassId) {
                const currentClass = (classesQuery.data ?? []).find((item) => item.id === selectedClassId);
                if (nextSubSchoolId && currentClass?.sub_school !== nextSubSchoolId) {
                  setSelectedClassId(null);
                  setForm((current) => ({ ...current, student_class: "" }));
                }
              }
            }}
          />
          <OptionChips
            label="Class"
            options={admissionClassOptions.map((item) => ({
              label: item.sub_school_name ? `${item.name} - ${item.sub_school_name}` : item.name,
              value: item.id,
            }))}
            value={selectedClassId}
            onChange={(value) => {
              setSelectedClassId(value);
              const nextClass = (classesQuery.data ?? []).find((item) => item.id === value);
              setSelectedSubSchoolId(nextClass?.sub_school ?? null);
              setForm((current) => ({
                ...current,
                student_class: nextClass?.name ?? current.student_class,
                class_level: nextClass?.name ?? current.class_level,
                section: nextClass?.sub_school_name ?? current.section,
              }));
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
          {showOptionalFields ? (
            <>
              <Field
                label="Class Level"
                value={form.class_level}
                onChangeText={(value) => setForm((current) => ({ ...current, class_level: value }))}
                placeholder="e.g. Form 4, Lower Sixth"
              />
              <Field
                label="Section"
                value={form.section}
                onChangeText={(value) => setForm((current) => ({ ...current, section: value }))}
                placeholder="e.g. English Section"
              />
            </>
          ) : null}

          <SectionTitle title="Guardian Details" subtitle="Contact details used by school and parent workflows." />
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
          {showOptionalFields ? (
            <Field
              label="Guardian WhatsApp"
              value={form.guardian_whatsapp}
              onChangeText={(value) => setForm((current) => ({ ...current, guardian_whatsapp: value }))}
              placeholder="Guardian WhatsApp number"
            />
          ) : null}

          <AppButton
            label={showOptionalFields ? "Hide Optional Fields" : "Show Optional Fields"}
            variant="ghost"
            onPress={() => setShowOptionalFields((current) => !current)}
          />

          {showOptionalFields ? (
            <>
              <SectionTitle title="Optional Learner Details" subtitle="Use these when the school has the information ready." />
              <Field
                label="Email"
                value={form.email}
                onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                placeholder="Temporary email can be auto-generated by backend"
              />
              <Field
                label="Phone"
                value={form.phone}
                onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                placeholder="Learner phone"
              />
              <Field
                label="WhatsApp"
                value={form.whatsapp}
                onChangeText={(value) => setForm((current) => ({ ...current, whatsapp: value }))}
                placeholder="Learner WhatsApp"
              />
              <Field
                label="Date of Birth"
                value={form.date_of_birth}
                onChangeText={(value) => setForm((current) => ({ ...current, date_of_birth: value }))}
                placeholder="YYYY-MM-DD"
              />
              <Field
                label="Admission Number"
                value={form.admission_number}
                onChangeText={(value) => setForm((current) => ({ ...current, admission_number: value }))}
                placeholder="Leave blank to auto-generate"
              />
              <Field
                label="Admission Date"
                value={form.admission_date}
                onChangeText={(value) => setForm((current) => ({ ...current, admission_date: value }))}
                placeholder="YYYY-MM-DD"
              />
              <PasswordField
                label="Initial Password"
                value={form.password}
                onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
                placeholder="Leave empty for activation later"
              />
            </>
          ) : null}

          <SectionTitle title="Parent Account" subtitle="Create a linked parent login when needed." />
          <OptionChips
            label="Create Parent Account"
            options={[
              { label: "No", value: "no" },
              { label: "Yes", value: "yes" },
            ]}
            value={form.create_parent_account ? "yes" : "no"}
            onChange={(value) =>
              setForm((current) => ({ ...current, create_parent_account: value === "yes" }))
            }
          />
          {form.create_parent_account ? (
            <>
              <OptionChips
                label="Relationship"
                options={[...relationshipOptions]}
                value={form.parent_relationship}
                onChange={(value) => setForm((current) => ({ ...current, parent_relationship: value }))}
              />
              <Field
                label="Parent Name"
                value={form.parent_name}
                onChangeText={(value) => setForm((current) => ({ ...current, parent_name: value }))}
                placeholder="Parent account holder"
              />
              <Field
                label="Parent Phone"
                value={form.parent_phone}
                onChangeText={(value) => setForm((current) => ({ ...current, parent_phone: value }))}
                placeholder="Parent phone"
              />
              {showOptionalFields ? (
                <>
                  <Field
                    label="Parent Email"
                    value={form.parent_email}
                    onChangeText={(value) => setForm((current) => ({ ...current, parent_email: value }))}
                    placeholder="Parent email"
                  />
                  <Field
                    label="Parent WhatsApp"
                    value={form.parent_whatsapp}
                    onChangeText={(value) => setForm((current) => ({ ...current, parent_whatsapp: value }))}
                    placeholder="Parent WhatsApp"
                  />
                </>
              ) : null}
            </>
          ) : null}
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
