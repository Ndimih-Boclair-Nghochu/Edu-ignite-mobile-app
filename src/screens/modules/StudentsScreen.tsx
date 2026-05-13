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
import { CreateStudentRequest } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
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
  });

  const studentsQuery = useQuery({
    queryKey: queryKeys.students.list({ limit: 200 }),
    queryFn: () => studentsService.getStudents({ limit: 200 }),
  });

  const honourRollQuery = useQuery({
    queryKey: queryKeys.students.honourRoll,
    queryFn: () => studentsService.getHonourRoll({ limit: 50 }),
  });

  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes(),
    queryFn: () => schoolsService.getHierarchyClasses(),
  });

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
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

  const filteredStudents = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = studentsQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }

    return rows.filter((student) => {
      const haystack = `${student.user?.name ?? ""} ${student.user?.email ?? ""} ${student.admission_number ?? ""} ${student.user?.matricule ?? ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [deferredSearch, studentsQuery.data?.results]);

  const honourLearners = honourRollQuery.data?.results ?? [];

  async function handleCreateStudent() {
    if (!form.name.trim() || !form.guardian_name.trim() || !form.guardian_phone.trim()) {
      Alert.alert("Missing details", "Student name, guardian name, and guardian phone are required.");
      return;
    }

    const payload: CreateStudentRequest = {
      ...form,
      school_class: selectedClass?.id ?? null,
      student_class: selectedClass?.name ?? "Unassigned",
      class_level: selectedClass?.name ?? "General",
      section: selectedClass?.sub_school_name ?? schoolQuery.data?.short_name ?? "",
      create_parent_account: Boolean(
        form.parent_name.trim() && (form.parent_email.trim() || form.parent_phone.trim())
      ),
    };

    if (!isOnline) {
      await enqueue("CREATE_STUDENT", payload, `Register student ${form.name.trim()}`);
      setForm(defaultForm);
      setSelectedClassId(null);
      setFormOpen(false);
      Alert.alert("Saved offline", "The admission has been queued and will sync when online.");
      return;
    }

    createStudentMutation.mutate(payload);
  }

  return (
    <Screen
      title="Students"
      subtitle="Admissions, guardian links, parent onboarding, and honour-roll visibility."
      rightAction={
        canCreate ? (
          <AppButton compact label="Register" onPress={() => setFormOpen(true)} />
        ) : undefined
      }
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? "Student Registry"}
        title={schoolQuery.data?.name ?? "School student registry"}
        description="Keep the learner registry clean, school-scoped, and ready for parent linkage on the same backend used by the web dashboard."
      />

      <View style={{ gap: 12 }}>
        <StatCard
          label="Active Enrollment"
          value={summaryQuery.data?.active_enrollment ?? 0}
          helper="Students linked to this school."
        />
        <StatCard
          label="Parent Accounts"
          value={summaryQuery.data?.parent_accounts ?? 0}
          helper="Parent logins inside the same school scope."
        />
        <StatCard
          label="Students Linked"
          value={summaryQuery.data?.students_linked ?? 0}
          helper="Learners already tied to at least one parent."
          tone="success"
        />
        <StatCard
          label="Honour Roll"
          value={summaryQuery.data?.honour_roll_count ?? 0}
          helper="Learners above the honour threshold."
        />
      </View>

      <Field
        label="Search Learners"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, email, matricule, or admission number"
      />

      <SectionTitle title="Student Registry" subtitle="All learners currently visible inside this school." />
      {studentsQuery.isLoading && !studentsQuery.data ? (
        <LoadingState label="Loading student registry..." />
      ) : filteredStudents.length ? (
        <View style={{ gap: 12 }}>
          {filteredStudents.map((student) => (
            <Card key={student.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {student.user?.name ?? "Student"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    {student.user?.matricule || "No matricule yet"} • {student.admission_number}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    {student.school_class_name || student.student_class} • Guardian: {student.guardian_name}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    Admission date: {formatDate(student.admission_date)}
                  </Text>
                </View>
                <View style={{ gap: 8, alignItems: "flex-end" }}>
                  <Tag label={`${student.parent_count ?? 0} parent`} />
                  {student.is_on_honour_roll ? <Tag label="Honour" tone="success" /> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No students found"
          description="The current cache does not contain any learner matching this search."
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
          description="The mobile cache does not show any learner above the school threshold right now."
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
              label: item.name,
              value: item.id,
            }))}
            value={selectedClassId}
            onChange={setSelectedClassId}
          />
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
            label={isOnline ? "Create Student" : "Queue Admission"}
            onPress={() => void handleCreateStudent()}
            loading={createStudentMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
