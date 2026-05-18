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
import { gradesService } from "@/lib/api/services/grades.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { usersService } from "@/lib/api/services/users.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatDate, formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";

const typeOptions = [
  { label: "All types", value: "all" },
  { label: "Mandatory", value: "mandatory" },
  { label: "Optional", value: "optional" },
];

function buildSubjectCode(name: string) {
  const sanitized = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  return sanitized.slice(0, 3) || "SUB";
}

export function SubjectsScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCatalogSubjectId, setSelectedCatalogSubjectId] = useState<string | null>(null);
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedCreateClassId, setSelectedCreateClassId] = useState<string | null>(null);
  const [subjectType, setSubjectType] = useState<"mandatory" | "optional">("mandatory");
  const [coefficient, setCoefficient] = useState("2");

  const canManage = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER"].includes(user?.role ?? "");

  const schoolQuery = useQuery({
    queryKey: queryKeys.schools.me,
    queryFn: () => schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const schoolId = schoolQuery.data?.id || user?.school?.id || "";

  const classesQuery = useQuery({
    queryKey: queryKeys.schools.classes(),
    queryFn: () => schoolsService.getHierarchyClasses({ school_id: schoolId || undefined }),
    enabled: Boolean(user),
  });

  const hierarchySubjectsQuery = useQuery({
    queryKey: queryKeys.schools.subjects({ school_id: schoolId || "current" }),
    queryFn: () => schoolsService.getHierarchySubjects({ school_id: schoolId || undefined }),
    enabled: Boolean(user),
  });

  const subjectsQuery = useQuery({
    queryKey: ["grades", "subjects", schoolId || "current"],
    queryFn: () => gradesService.getSubjects({ page_size: 300 }),
    enabled: Boolean(user),
  });

  const sequencesQuery = useQuery({
    queryKey: ["grades", "sequences"],
    queryFn: () => gradesService.getSequences({ page_size: 50 }),
    enabled: Boolean(user),
  });

  const teachersQuery = useQuery({
    queryKey: ["users", "school", schoolId, "academic-staff"],
    queryFn: () =>
      usersService.getUsersBySchool(schoolId, {
        role: "TEACHER,SCHOOL_ADMIN,SUB_ADMIN",
        page_size: 300,
        ordering: "name",
      }),
    enabled: Boolean(schoolId),
  });

  const createSubjectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCreateClassId) {
        throw new Error("Choose the class that should receive this subject.");
      }

      const selectedClass = (classesQuery.data ?? []).find((entry) => entry.id === selectedCreateClassId);
      if (!selectedClass) {
        throw new Error("The selected class could not be found.");
      }

      const catalogRows = subjectsQuery.data?.results ?? [];
      let subjectId = selectedCatalogSubjectId === null ? null : selectedCatalogSubjectId;
      let subjectName =
        catalogRows.find((entry) => entry.id === selectedCatalogSubjectId)?.name ??
        customSubjectName.trim();

      if (!subjectId) {
        const matched = catalogRows.find(
          (entry) => entry.name.toLowerCase() === customSubjectName.trim().toLowerCase()
        );

        if (matched) {
          subjectId = matched.id;
          subjectName = matched.name;
        } else {
          if (!customSubjectName.trim()) {
            throw new Error("Choose an existing subject or enter a subject name.");
          }

          subjectName = customSubjectName.trim();
        }
      }

      return schoolsService.createHierarchySubject({
        school_class: selectedClass.id,
        class_name: selectedClass.name,
        subject: subjectId ?? null,
        subject_name: subjectName,
        subject_code: subjectId ? undefined : buildSubjectCode(subjectName),
        teacher: selectedTeacherId ?? undefined,
        type: subjectType,
        coefficient: Number(coefficient || 0) || 1,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setSelectedCatalogSubjectId(null);
      setCustomSubjectName("");
      setSelectedTeacherId(null);
      setSelectedCreateClassId(null);
      setSubjectType("mandatory");
      setCoefficient("2");
      await Promise.all([
        hierarchySubjectsQuery.refetch(),
        subjectsQuery.refetch(),
        sequencesQuery.refetch(),
      ]);
      Alert.alert("Subject saved", "The subject allocation has been updated.");
    },
    onError: (error) => {
      Alert.alert("Subject save failed", getApiErrorMessage(error));
    },
  });

  const filteredAssignments = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return (hierarchySubjectsQuery.data ?? []).filter((entry) => {
      const classMatch = selectedClassId === "all" || entry.school_class === selectedClassId;
      const typeMatch = selectedType === "all" || entry.type === selectedType;
      const searchMatch =
        !keyword ||
        `${entry.subject_name ?? ""} ${entry.subject_code ?? ""} ${entry.class_name ?? ""} ${entry.teacher_name ?? ""}`
          .toLowerCase()
          .includes(keyword);
      return classMatch && typeMatch && searchMatch;
    });
  }, [deferredSearch, hierarchySubjectsQuery.data, selectedClassId, selectedType]);

  const classCoverage = useMemo(
    () => new Set((hierarchySubjectsQuery.data ?? []).map((entry) => entry.school_class)).size,
    [hierarchySubjectsQuery.data]
  );

  return (
    <Screen
      title="Institutional Subjects"
      subtitle="Academic subjects, class allocations, sequences, and teacher ownership from the shared backend."
      rightAction={canManage ? <AppButton compact label="Add Subject" onPress={() => setModalOpen(true)} /> : undefined}
    >
      <HeroCard
        eyebrow={schoolQuery.data?.short_name ?? "Academic Registry"}
        title={schoolQuery.data?.name ?? "Institutional subjects"}
        description="Review the same subject catalog, class allocations, and academic periods carried by the web workspace."
      />

      <View style={{ gap: 12 }}>
        <StatCard label="Subject Catalog" value={subjectsQuery.data?.results?.length ?? 0} helper="Academic subjects currently registered." />
        <StatCard label="Class Subjects" value={hierarchySubjectsQuery.data?.length ?? 0} helper="Allocated class-subject relationships." />
        <StatCard label="Class Coverage" value={classCoverage} helper="Classes currently carrying at least one subject." />
        <StatCard label="Sequences" value={sequencesQuery.data?.results?.length ?? 0} helper="Academic sequences available for grading and exams." />
      </View>

      <Card>
        <SectionTitle title="Filters" subtitle="Narrow the subject view by class, type, or search." />
        <Field
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by subject, code, class, or teacher"
        />
        <OptionChips
          label="Class"
          options={[
            { label: "All classes", value: "all" },
            ...((classesQuery.data ?? []).map((entry) => ({ label: entry.name, value: entry.id })) ?? []),
          ]}
          value={selectedClassId}
          onChange={setSelectedClassId}
        />
        <OptionChips label="Type" options={typeOptions} value={selectedType} onChange={setSelectedType} />
      </Card>

      <SectionTitle title="Class Subject Allocations" subtitle="Subjects currently attached to school classes." />
      {hierarchySubjectsQuery.isLoading && !hierarchySubjectsQuery.data ? (
        <LoadingState label="Loading subject allocations..." />
      ) : filteredAssignments.length ? (
        <View style={{ gap: 12 }}>
          {filteredAssignments.map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {entry.subject_name || "Subject allocation"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.class_name || "Class pending"} • {entry.teacher_name || "Teacher pending"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    Code: {entry.subject_code || "Pending"} • Coefficient: {entry.coefficient || 0}
                  </Text>
                </View>
                <View style={{ gap: 8, alignItems: "flex-end" }}>
                  <Tag label={entry.type} />
                  {entry.sub_school?.name ? <Tag label={entry.sub_school.name} tone="success" /> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No class subjects found"
          description="No subject allocation matches the current class and type filters."
        />
      )}

      <SectionTitle title="Academic Subject Catalog" subtitle="Standalone subject records available to the institution." />
      {subjectsQuery.isLoading && !subjectsQuery.data ? (
        <LoadingState label="Loading subject catalog..." />
      ) : (subjectsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(subjectsQuery.data?.results ?? []).slice(0, 10).map((entry) => (
            <Card key={entry.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>{entry.name}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.code} • {entry.level || "Level pending"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name || "Not assigned"} • Coefficient: {entry.coefficient || 0}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No subjects in the catalog"
          description="Academic subjects created on web or mobile will appear here."
        />
      )}

      <SectionTitle title="Sequences" subtitle="Assessment periods currently active for this school." />
      {sequencesQuery.isLoading && !sequencesQuery.data ? (
        <LoadingState label="Loading sequences..." />
      ) : (sequencesQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(sequencesQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>{entry.name}</Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.academic_year} • Term {entry.term}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    {formatDate(entry.start_date)} to {formatDate(entry.end_date)}
                  </Text>
                </View>
                {entry.is_active ? <Tag label="Active" tone="success" /> : <Tag label="Closed" />}
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No sequences yet"
          description="Assessment sequences will appear here once they are created."
        />
      )}

      <ModalSheet visible={modalOpen} title="Add Subject" onClose={() => setModalOpen(false)}>
        <View style={{ gap: 16 }}>
          <OptionChips
            label="Class"
            options={(classesQuery.data ?? []).map((entry) => ({ label: entry.name, value: entry.id }))}
            value={selectedCreateClassId}
            onChange={setSelectedCreateClassId}
          />
          <OptionChips
            label="Existing Subject"
            options={(subjectsQuery.data?.results ?? []).map((entry) => ({
              label: entry.name,
              value: entry.id,
            }))}
            value={selectedCatalogSubjectId}
            onChange={setSelectedCatalogSubjectId}
          />
          <Field
            label="Subject Name"
            value={customSubjectName}
            onChangeText={setCustomSubjectName}
            placeholder="Enter a subject name when it is not yet in the catalog"
          />
          <OptionChips
            label="Teacher"
            options={(teachersQuery.data?.results ?? []).map((entry) => ({
              label: `${entry.name} (${formatRole(entry.role)})`,
              value: entry.id,
            }))}
            value={selectedTeacherId}
            onChange={setSelectedTeacherId}
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
          <Field
            label="Coefficient"
            value={coefficient}
            keyboardType="numeric"
            onChangeText={setCoefficient}
            placeholder="2"
          />
          <AppButton
            label="Save Subject"
            onPress={() => createSubjectMutation.mutate()}
            loading={createSubjectMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
