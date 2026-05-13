import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
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
import { queryKeys } from "@/lib/queryKeys";
import { useSync } from "@/providers/SyncProvider";

export function StructureScreen() {
  const { enqueue, isOnline } = useSync();
  const [subSchoolOpen, setSubSchoolOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [subSchoolName, setSubSchoolName] = useState("");
  const [subSchoolVicePrincipal, setSubSchoolVicePrincipal] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [classSubSchool, setClassSubSchool] = useState<string | null>(null);

  const subSchoolsQuery = useQuery({
    queryKey: queryKeys.schools.subSchools,
    queryFn: () => schoolsService.getSubSchools(),
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes(),
    queryFn: () => schoolsService.getHierarchyClasses(),
  });
  const staffQuery = useQuery({
    queryKey: queryKeys.schools.staff,
    queryFn: () => schoolsService.getHierarchyStaff(),
  });
  const subjectsQuery = useQuery({
    queryKey: queryKeys.schools.subjects(),
    queryFn: () => schoolsService.getHierarchySubjects(),
  });

  const createSubSchoolMutation = useMutation({
    mutationFn: (payload: { name: string; vice_principal?: string | null }) =>
      schoolsService.createSubSchool(payload),
    onSuccess: async () => {
      setSubSchoolOpen(false);
      setSubSchoolName("");
      setSubSchoolVicePrincipal(null);
      await Promise.all([subSchoolsQuery.refetch(), classesQuery.refetch()]);
      Alert.alert("Sub-school created", "The school hierarchy has been updated.");
    },
    onError: (error) => Alert.alert("Creation failed", getApiErrorMessage(error)),
  });

  const createClassMutation = useMutation({
    mutationFn: (payload: { name: string; sub_school?: string | null }) =>
      schoolsService.createHierarchyClass(payload),
    onSuccess: async () => {
      setClassOpen(false);
      setClassName("");
      setClassSubSchool(null);
      await classesQuery.refetch();
      Alert.alert("Class created", "The hierarchy class has been created successfully.");
    },
    onError: (error) => Alert.alert("Creation failed", getApiErrorMessage(error)),
  });

  async function handleCreateSubSchool() {
    if (!subSchoolName.trim()) {
      Alert.alert("Missing name", "Enter the sub-school or section name.");
      return;
    }
    const payload = {
      name: subSchoolName.trim(),
      vice_principal: subSchoolVicePrincipal ?? undefined,
    };

    if (!isOnline) {
      await enqueue("CREATE_SUB_SCHOOL", payload, `Create sub-school ${subSchoolName.trim()}`);
      setSubSchoolOpen(false);
      setSubSchoolName("");
      setSubSchoolVicePrincipal(null);
      Alert.alert("Queued offline", "The sub-school will sync when online.");
      return;
    }

    createSubSchoolMutation.mutate(payload);
  }

  async function handleCreateClass() {
    if (!className.trim()) {
      Alert.alert("Missing class name", "Enter the class name to create.");
      return;
    }
    const payload = {
      name: className.trim(),
      sub_school: classSubSchool ?? undefined,
    };

    if (!isOnline) {
      await enqueue("CREATE_HIERARCHY_CLASS", payload, `Create class ${className.trim()}`);
      setClassOpen(false);
      setClassName("");
      setClassSubSchool(null);
      Alert.alert("Queued offline", "The class will sync when online.");
      return;
    }

    createClassMutation.mutate(payload);
  }

  return (
    <Screen
      title="Hierarchy & Sections"
      subtitle="Real sub-schools, staff hierarchy, classes, and linked subjects."
    >
      <HeroCard
        eyebrow="School Structure"
        title="Hierarchy Registry"
        description="This view stays school-scoped so mobile users can inspect the same structure managed on the web dashboard."
      />

      <View style={{ gap: 12 }}>
        <StatCard
          label="Sub Schools"
          value={subSchoolsQuery.data?.length ?? 0}
          helper="Sections and campuses currently linked to this school."
        />
        <StatCard
          label="Admins & Staff"
          value={staffQuery.data?.length ?? 0}
          helper="Staff currently available in hierarchy workflows."
        />
        <StatCard
          label="Classes"
          value={classesQuery.data?.length ?? 0}
          helper="Class registry inside the academic hierarchy."
        />
        <StatCard
          label="Class Subjects"
          value={subjectsQuery.data?.length ?? 0}
          helper="Subject allocations already connected to classes."
        />
      </View>

      <SectionTitle
        title="Quick Actions"
        subtitle="Create structure records directly from mobile."
      />
      <View style={{ gap: 12 }}>
        <AppButton label="Add Sub School" onPress={() => setSubSchoolOpen(true)} />
        <AppButton label="Add Class" variant="secondary" onPress={() => setClassOpen(true)} />
      </View>

      <SectionTitle title="Sub Schools" subtitle="Current sections and vice principals." />
      {subSchoolsQuery.isLoading && !subSchoolsQuery.data ? (
        <LoadingState label="Loading sub-schools..." />
      ) : (subSchoolsQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(subSchoolsQuery.data ?? []).map((subSchool) => (
            <Card key={subSchool.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {subSchool.name}
              </Text>
              <Text style={{ color: "#667085" }}>
                VP: {subSchool.vice_principal_name || "Not assigned"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={`${subSchool.total_classes} classes`} />
                <Tag label={`${subSchool.total_subjects} subjects`} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No sub-schools yet"
          description="Create the first section or campus from the action above."
        />
      )}

      <SectionTitle title="Classes" subtitle="Classes currently configured inside the hierarchy." />
      {classesQuery.isLoading && !classesQuery.data ? (
        <LoadingState label="Loading classes..." />
      ) : (classesQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(classesQuery.data ?? []).map((schoolClass) => (
            <Card key={schoolClass.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {schoolClass.name}
              </Text>
              <Text style={{ color: "#667085" }}>
                {schoolClass.sub_school_name || "General section"} • {schoolClass.total_students} students
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={`${schoolClass.total_subjects} subjects`} />
                <Tag label={`${schoolClass.total_teachers} teachers`} />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No classes yet"
          description="Create the first class to start using school-scoped hierarchy flows on mobile."
        />
      )}

      <SectionTitle title="Subjects" subtitle="Subject allocations currently visible from the backend." />
      {subjectsQuery.isLoading && !subjectsQuery.data ? (
        <LoadingState label="Loading class subjects..." />
      ) : (subjectsQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(subjectsQuery.data ?? []).map((subject) => (
            <Card key={subject.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {subject.subject_name || "Assigned subject"}
              </Text>
              <Text style={{ color: "#667085" }}>
                {subject.class_name || "Class not specified"} • {subject.teacher_name || "Teacher pending"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={subject.type} />
                {subject.coefficient ? <Tag label={`Coef ${subject.coefficient}`} /> : null}
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No class subjects yet"
          description="Subject allocations created on web or mobile will appear here."
        />
      )}

      <ModalSheet visible={subSchoolOpen} title="Create Sub School" onClose={() => setSubSchoolOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field
            label="Sub School Name"
            value={subSchoolName}
            onChangeText={setSubSchoolName}
            placeholder="e.g. English Section Campus"
          />
          <OptionChips
            label="Vice Principal (optional)"
            options={(staffQuery.data ?? []).map((staff) => ({
              label: staff.name,
              value: staff.id,
            }))}
            value={subSchoolVicePrincipal}
            onChange={setSubSchoolVicePrincipal}
          />
          <AppButton
            label={isOnline ? "Save Sub School" : "Queue Sub School"}
            onPress={() => void handleCreateSubSchool()}
            loading={createSubSchoolMutation.isPending}
          />
        </View>
      </ModalSheet>

      <ModalSheet visible={classOpen} title="Create Class" onClose={() => setClassOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field
            label="Class Name"
            value={className}
            onChangeText={setClassName}
            placeholder="e.g. Form 4 Science"
          />
          <OptionChips
            label="Sub School (optional)"
            options={(subSchoolsQuery.data ?? []).map((subSchool) => ({
              label: subSchool.name,
              value: subSchool.id,
            }))}
            value={classSubSchool}
            onChange={setClassSubSchool}
          />
          <AppButton
            label={isOnline ? "Save Class" : "Queue Class"}
            onPress={() => void handleCreateClass()}
            loading={createClassMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
