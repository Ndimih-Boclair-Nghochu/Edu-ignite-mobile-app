import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
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
import { gradesService } from "@/lib/api/services/grades.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const NONE = "__none__";

function buildSubjectCode(name: string) {
  const initials = name
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials.slice(0, 4) || name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4) || "SUBJ";
}

export function StructureScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [subSchoolOpen, setSubSchoolOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);

  const [subSchoolName, setSubSchoolName] = useState("");
  const [subSchoolVicePrincipal, setSubSchoolVicePrincipal] = useState(NONE);

  const [adminStaffId, setAdminStaffId] = useState<string | null>(null);
  const [adminSubSchoolId, setAdminSubSchoolId] = useState<string | null>(null);

  const [className, setClassName] = useState("");
  const [classSubSchool, setClassSubSchool] = useState(NONE);
  const [classMaster, setClassMaster] = useState(NONE);

  const [subjectClassId, setSubjectClassId] = useState<string | null>(null);
  const [subjectCatalogId, setSubjectCatalogId] = useState(NONE);
  const [subjectName, setSubjectName] = useState("");
  const [subjectTeacher, setSubjectTeacher] = useState(NONE);
  const [subjectType, setSubjectType] = useState<"mandatory" | "optional">("mandatory");
  const [coefficient, setCoefficient] = useState("2");

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const subSchoolsQuery = useQuery({
    queryKey: [...queryKeys.schools.subSchools, schoolId || "current"],
    queryFn: () => schoolsService.getSubSchools(schoolId || undefined),
    enabled: Boolean(user),
  });

  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes({ school_id: schoolId || "current" }),
    queryFn: () => schoolsService.getHierarchyClasses({ school_id: schoolId || undefined }),
    enabled: Boolean(user),
  });

  const staffQuery = useQuery({
    queryKey: [...queryKeys.schools.staff, schoolId || "current"],
    queryFn: () => schoolsService.getHierarchyStaff(schoolId || undefined),
    enabled: Boolean(user),
  });

  const subAdminsQuery = useQuery({
    queryKey: ["schools", "hierarchy", "sub-admins", schoolId || "current"],
    queryFn: () => schoolsService.getSubAdmins(schoolId || undefined),
    enabled: Boolean(user),
  });

  const subjectsQuery = useQuery({
    queryKey: queryKeys.schools.subjects({ school_id: schoolId || "current" }),
    queryFn: () => schoolsService.getHierarchySubjects({ school_id: schoolId || undefined }),
    enabled: Boolean(user),
  });

  const subjectCatalogQuery = useQuery({
    queryKey: ["grades", "subjects", schoolId || "current", "structure"],
    queryFn: () => gradesService.getSubjects({ page_size: 300 }),
    enabled: Boolean(user),
  });

  const staffOptions = useMemo(
    () => (staffQuery.data ?? []).filter((staff) => !["STUDENT", "PARENT"].includes(staff.role)),
    [staffQuery.data]
  );

  const teachingStaffOptions = useMemo(
    () =>
      (staffQuery.data ?? []).filter((staff) =>
        ["TEACHER", "SUB_ADMIN", "SCHOOL_ADMIN"].includes(staff.role)
      ),
    [staffQuery.data]
  );

  const selectedSubjectCatalog = useMemo(
    () => (subjectCatalogQuery.data?.results ?? []).find((entry) => entry.id === subjectCatalogId) ?? null,
    [subjectCatalogId, subjectCatalogQuery.data?.results]
  );

  const createSubSchoolMutation = useMutation({
    mutationFn: (payload: { name: string; vice_principal?: string | null; school_id?: string }) =>
      schoolsService.createSubSchool(payload),
    onSuccess: async () => {
      setSubSchoolOpen(false);
      setSubSchoolName("");
      setSubSchoolVicePrincipal(NONE);
      await Promise.all([subSchoolsQuery.refetch(), classesQuery.refetch(), staffQuery.refetch()]);
      Alert.alert("Sub-school created", "The school hierarchy has been updated.");
    },
    onError: (error) => Alert.alert("Creation failed", getApiErrorMessage(error)),
  });

  const assignAdminMutation = useMutation({
    mutationFn: (payload: { staff: string; sub_school: string; school_id?: string }) =>
      schoolsService.assignSubAdmin(payload),
    onSuccess: async () => {
      setAdminOpen(false);
      setAdminStaffId(null);
      setAdminSubSchoolId(null);
      await Promise.all([subAdminsQuery.refetch(), staffQuery.refetch(), subSchoolsQuery.refetch()]);
      Alert.alert("Admin assigned", "The sub-school admin assignment is active.");
    },
    onError: (error) => Alert.alert("Assignment failed", getApiErrorMessage(error)),
  });

  const createClassMutation = useMutation({
    mutationFn: (payload: { name: string; sub_school?: string | null; class_master?: string | null; school_id?: string }) =>
      schoolsService.createHierarchyClass(payload),
    onSuccess: async () => {
      setClassOpen(false);
      setClassName("");
      setClassSubSchool(NONE);
      setClassMaster(NONE);
      await Promise.all([classesQuery.refetch(), subSchoolsQuery.refetch()]);
      Alert.alert("Class created", "The hierarchy class has been created successfully.");
    },
    onError: (error) => Alert.alert("Creation failed", getApiErrorMessage(error)),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (payload: {
      school_class: string;
      subject?: string | null;
      subject_name?: string;
      subject_code?: string;
      teacher?: string | null;
      type: "mandatory" | "optional";
      coefficient: number;
      school_id?: string;
    }) => schoolsService.createHierarchySubject(payload),
    onSuccess: async () => {
      setSubjectOpen(false);
      resetSubjectForm();
      await Promise.all([subjectsQuery.refetch(), classesQuery.refetch(), subSchoolsQuery.refetch(), subjectCatalogQuery.refetch()]);
      Alert.alert("Subject saved", "The class-subject relationship is now active.");
    },
    onError: (error) => Alert.alert("Subject save failed", getApiErrorMessage(error)),
  });

  function resetSubjectForm() {
    setSubjectClassId(null);
    setSubjectCatalogId(NONE);
    setSubjectName("");
    setSubjectTeacher(NONE);
    setSubjectType("mandatory");
    setCoefficient("2");
  }

  async function handleCreateSubSchool() {
    if (!subSchoolName.trim()) {
      Alert.alert("Missing name", "Enter the sub-school or section name.");
      return;
    }

    const payload = {
      name: subSchoolName.trim(),
      vice_principal: subSchoolVicePrincipal === NONE ? null : subSchoolVicePrincipal,
      school_id: schoolId || undefined,
    };

    if (!isOnline) {
      await enqueue("CREATE_SUB_SCHOOL", payload, `Create sub-school ${subSchoolName.trim()}`);
      setSubSchoolOpen(false);
      setSubSchoolName("");
      setSubSchoolVicePrincipal(NONE);
      Alert.alert("Sub-school saved", "The hierarchy update has been recorded.");
      return;
    }

    createSubSchoolMutation.mutate(payload);
  }

  async function handleAssignAdmin() {
    if (!adminStaffId || !adminSubSchoolId) {
      Alert.alert("Missing assignment", "Select both the staff member and sub-school.");
      return;
    }

    const payload = {
      staff: adminStaffId,
      sub_school: adminSubSchoolId,
      school_id: schoolId || undefined,
    };

    if (!isOnline) {
      await enqueue("ASSIGN_SUB_ADMIN", payload, "Assign sub-school admin");
      setAdminOpen(false);
      setAdminStaffId(null);
      setAdminSubSchoolId(null);
      Alert.alert("Assignment saved", "The hierarchy update has been recorded.");
      return;
    }

    assignAdminMutation.mutate(payload);
  }

  async function handleCreateClass() {
    if (!className.trim()) {
      Alert.alert("Missing class name", "Enter the class name to create.");
      return;
    }

    const payload = {
      name: className.trim(),
      sub_school: classSubSchool === NONE ? null : classSubSchool,
      class_master: classMaster === NONE ? null : classMaster,
      school_id: schoolId || undefined,
    };

    if (!isOnline) {
      await enqueue("CREATE_HIERARCHY_CLASS", payload, `Create class ${className.trim()}`);
      setClassOpen(false);
      setClassName("");
      setClassSubSchool(NONE);
      setClassMaster(NONE);
      Alert.alert("Class saved", "The hierarchy update has been recorded.");
      return;
    }

    createClassMutation.mutate(payload);
  }

  async function handleCreateSubject() {
    if (!subjectClassId) {
      Alert.alert("Missing class", "Choose the class that should receive this subject.");
      return;
    }

    const typedName = subjectName.trim();
    if (subjectCatalogId === NONE && !typedName) {
      Alert.alert("Missing subject", "Select an existing subject or enter a new subject name.");
      return;
    }

    const coefficientValue = Number(coefficient || 0);
    if (!coefficientValue || coefficientValue <= 0) {
      Alert.alert("Invalid coefficient", "Enter a coefficient greater than zero.");
      return;
    }

    const payload = {
      school_class: subjectClassId,
      subject: subjectCatalogId === NONE ? null : subjectCatalogId,
      subject_name: subjectCatalogId === NONE ? typedName : selectedSubjectCatalog?.name ?? "",
      subject_code: subjectCatalogId === NONE ? buildSubjectCode(typedName) : selectedSubjectCatalog?.code ?? "",
      teacher: subjectTeacher === NONE ? null : subjectTeacher,
      type: subjectType,
      coefficient: coefficientValue,
      school_id: schoolId || undefined,
    };

    if (!isOnline) {
      await enqueue("CREATE_HIERARCHY_SUBJECT", payload, "Create class subject");
      setSubjectOpen(false);
      resetSubjectForm();
      Alert.alert("Subject saved", "The subject allocation has been recorded.");
      return;
    }

    createSubjectMutation.mutate(payload);
  }

  return (
    <Screen
      title="Hierarchy & Sections"
      subtitle="Sub-schools, admins, classes, and subject allocations from the live school hierarchy."
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? "School Structure"}
        title="Hierarchy Registry"
        description="Manage the same hierarchy used by admissions, subjects, ID cards, attendance, and reports."
      />

      <View style={{ gap: 12 }}>
        <StatCard label="Sub Schools" value={subSchoolsQuery.data?.length ?? 0} helper="Sections and campuses linked to this school." />
        <StatCard label="Admins" value={subAdminsQuery.data?.length ?? 0} helper="Staff assigned to manage sub-schools." />
        <StatCard label="Classes" value={classesQuery.data?.length ?? 0} helper="Class registry inside the academic hierarchy." />
        <StatCard label="Class Subjects" value={subjectsQuery.data?.length ?? 0} helper="Subject allocations connected to classes." />
      </View>

      <SectionTitle title="Quick Actions" subtitle="Create and connect school hierarchy records." />
      <View style={{ gap: 12 }}>
        <AppButton label="Add Sub School" onPress={() => setSubSchoolOpen(true)} />
        <AppButton label="Assign Admin" variant="secondary" onPress={() => setAdminOpen(true)} />
        <AppButton label="Add Class" variant="secondary" onPress={() => setClassOpen(true)} />
        <AppButton label="Add Subject" variant="secondary" onPress={() => setSubjectOpen(true)} />
      </View>

      <SectionTitle title="Sub Schools" subtitle="Current sections and vice principals." />
      {subSchoolsQuery.isLoading && !subSchoolsQuery.data ? (
        <LoadingState label="Loading sub-schools..." />
      ) : (subSchoolsQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(subSchoolsQuery.data ?? []).map((subSchool) => (
            <Card key={subSchool.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{subSchool.name}</Text>
              <Text style={{ color: "#667085" }}>VP: {subSchool.vice_principal_name || "Not assigned"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={`${subSchool.total_classes} classes`} />
                <Tag label={`${subSchool.total_subjects} subjects`} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No sub-schools yet" description="Create the first section or campus from the actions above." />
      )}

      <SectionTitle title="Admins" subtitle="Sub-school admin assignments." />
      {subAdminsQuery.isLoading && !subAdminsQuery.data ? (
        <LoadingState label="Loading admin assignments..." />
      ) : (subAdminsQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(subAdminsQuery.data ?? []).map((admin) => (
            <Card key={admin.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{admin.name}</Text>
              <Text style={{ color: "#667085" }}>{admin.matricule || "Matricule pending"}</Text>
              <Tag label={admin.assigned_sub_school_name || "Sub-school pending"} tone="success" />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No admin assignments" description="Assign a staff member to a sub-school when delegated management is needed." />
      )}

      <SectionTitle title="Classes" subtitle="Classes currently configured inside the hierarchy." />
      {classesQuery.isLoading && !classesQuery.data ? (
        <LoadingState label="Loading classes..." />
      ) : (classesQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(classesQuery.data ?? []).map((schoolClass) => (
            <Card key={schoolClass.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{schoolClass.name}</Text>
              <Text style={{ color: "#667085" }}>
                {schoolClass.sub_school_name || "General section"} - {schoolClass.total_students} students
              </Text>
              <Text style={{ color: "#667085" }}>
                Class master: {schoolClass.class_master_name || "Not assigned"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={`${schoolClass.total_subjects} subjects`} />
                <Tag label={`${schoolClass.total_teachers} teachers`} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No classes yet" description="Create the first class before registering learners or assigning subjects." />
      )}

      <SectionTitle title="Subjects" subtitle="Subject allocations currently visible from the backend." />
      {subjectsQuery.isLoading && !subjectsQuery.data ? (
        <LoadingState label="Loading class subjects..." />
      ) : (subjectsQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(subjectsQuery.data ?? []).map((subject) => (
            <Card key={subject.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{subject.subject_name || "Assigned subject"}</Text>
              <Text style={{ color: "#667085" }}>
                {subject.class_name || "Class not specified"} - {subject.teacher_name || "Teacher pending"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={subject.type || "mandatory"} />
                {subject.sub_school?.name ? <Tag label={subject.sub_school.name} tone="success" /> : null}
                {subject.coefficient ? <Tag label={`Coef ${subject.coefficient}`} /> : null}
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No class subjects yet" description="Use Add Subject to connect subjects to registered classes." />
      )}

      <ModalSheet visible={subSchoolOpen} title="Create Sub School" onClose={() => setSubSchoolOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Sub School Name" value={subSchoolName} onChangeText={setSubSchoolName} placeholder="e.g. English Section Campus" />
          <OptionChips
            label="Vice Principal"
            options={[
              { label: "No VP", value: NONE },
              ...staffOptions.map((staff) => ({ label: `${staff.name} (${formatRole(staff.role)})`, value: staff.id })),
            ]}
            value={subSchoolVicePrincipal}
            onChange={setSubSchoolVicePrincipal}
          />
          <AppButton label="Save Sub School" onPress={() => void handleCreateSubSchool()} loading={createSubSchoolMutation.isPending} />
        </View>
      </ModalSheet>

      <ModalSheet visible={adminOpen} title="Assign Admin" onClose={() => setAdminOpen(false)}>
        <View style={{ gap: 16 }}>
          <OptionChips
            label="Staff"
            options={staffOptions.map((staff) => ({ label: `${staff.name} (${formatRole(staff.role)})`, value: staff.id }))}
            value={adminStaffId}
            onChange={setAdminStaffId}
          />
          <OptionChips
            label="Sub School"
            options={(subSchoolsQuery.data ?? []).map((subSchool) => ({ label: subSchool.name, value: subSchool.id }))}
            value={adminSubSchoolId}
            onChange={setAdminSubSchoolId}
          />
          <AppButton label="Save Assignment" onPress={() => void handleAssignAdmin()} loading={assignAdminMutation.isPending} />
        </View>
      </ModalSheet>

      <ModalSheet visible={classOpen} title="Create Class" onClose={() => setClassOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Class Name" value={className} onChangeText={setClassName} placeholder="e.g. Form 4 Science" />
          <OptionChips
            label="Sub School"
            options={[
              { label: "General", value: NONE },
              ...(subSchoolsQuery.data ?? []).map((subSchool) => ({ label: subSchool.name, value: subSchool.id })),
            ]}
            value={classSubSchool}
            onChange={setClassSubSchool}
          />
          <OptionChips
            label="Class Master"
            options={[
              { label: "No master", value: NONE },
              ...teachingStaffOptions.map((staff) => ({ label: `${staff.name} (${formatRole(staff.role)})`, value: staff.id })),
            ]}
            value={classMaster}
            onChange={setClassMaster}
          />
          <AppButton label="Save Class" onPress={() => void handleCreateClass()} loading={createClassMutation.isPending} />
        </View>
      </ModalSheet>

      <ModalSheet visible={subjectOpen} title="Add Subject" onClose={() => setSubjectOpen(false)}>
        <View style={{ gap: 16 }}>
          <OptionChips
            label="Class"
            options={(classesQuery.data ?? []).map((schoolClass) => ({
              label: schoolClass.sub_school_name ? `${schoolClass.name} - ${schoolClass.sub_school_name}` : schoolClass.name,
              value: schoolClass.id,
            }))}
            value={subjectClassId}
            onChange={setSubjectClassId}
          />
          <OptionChips
            label="Existing Subject"
            options={[
              { label: "New subject", value: NONE },
              ...(subjectCatalogQuery.data?.results ?? []).map((subject) => ({ label: subject.name, value: subject.id })),
            ]}
            value={subjectCatalogId}
            onChange={setSubjectCatalogId}
          />
          <Field
            label="Subject Name"
            value={subjectName}
            onChangeText={setSubjectName}
            editable={subjectCatalogId === NONE}
            placeholder="e.g. Mathematics"
          />
          <OptionChips
            label="Teacher"
            options={[
              { label: "No teacher", value: NONE },
              ...teachingStaffOptions.map((staff) => ({ label: `${staff.name} (${formatRole(staff.role)})`, value: staff.id })),
            ]}
            value={subjectTeacher}
            onChange={setSubjectTeacher}
          />
          <OptionChips
            label="Type"
            options={[
              { label: "Mandatory", value: "mandatory" },
              { label: "Optional", value: "optional" },
            ]}
            value={subjectType}
            onChange={(value) => setSubjectType(value as "mandatory" | "optional")}
          />
          <Field label="Coefficient" value={coefficient} keyboardType="numeric" onChangeText={setCoefficient} placeholder="2" />
          <AppButton label="Save Subject" onPress={() => void handleCreateSubject()} loading={createSubjectMutation.isPending} />
        </View>
      </ModalSheet>
    </Screen>
  );
}
