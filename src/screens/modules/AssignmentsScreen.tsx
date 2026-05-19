import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
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
import { assignmentsService } from "@/lib/api/services/assignments.service";
import { gradesService } from "@/lib/api/services/grades.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import type { CreateAssignmentRequest } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const submissionTypeOptions = [
  { label: "Text", value: "text" },
  { label: "File", value: "file" },
  { label: "Both", value: "both" },
];

const assignmentStatusOptions = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
];

function defaultDueDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function AssignmentsScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [maxMarks, setMaxMarks] = useState("20");
  const [submissionType, setSubmissionType] = useState<"text" | "file" | "both">("text");
  const [assignmentStatus, setAssignmentStatus] = useState<"draft" | "published">("published");
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const assignmentsQuery = useQuery({
    queryKey: ["assignments", "list", user?.role],
    queryFn: () => assignmentsService.getAssignments({ page_size: 100, ordering: "-due_date" }),
    enabled: Boolean(user),
  });

  const mySubmissionsQuery = useQuery({
    queryKey: ["assignments", "my-submissions"],
    queryFn: () => assignmentsService.getMySubmissions({ page_size: 100, ordering: "-created" }),
    enabled: isStudent,
  });

  const teacherSubmissionsQuery = useQuery({
    queryKey: ["assignments", "teacher-submissions"],
    queryFn: () => assignmentsService.getSubmissions({ page_size: 100, ordering: "-created" }),
    enabled: isTeacher,
  });

  const classesQuery = useQuery({
    queryKey: ["assignments", "classes"],
    queryFn: () => schoolsService.getHierarchyClasses(),
    enabled: isTeacher,
  });

  const subjectsQuery = useQuery({
    queryKey: ["assignments", "subjects"],
    queryFn: () => gradesService.getSubjects({ page_size: 300 }),
    enabled: isTeacher,
  });

  const selectedClass = useMemo(
    () => (classesQuery.data ?? []).find((entry) => entry.id === selectedClassId) ?? null,
    [classesQuery.data, selectedClassId]
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateAssignmentRequest) => assignmentsService.createAssignment(payload),
    onSuccess: async () => {
      setCreateOpen(false);
      setAssignmentTitle("");
      setInstructions("");
      setSelectedClassId(null);
      setSelectedSubjectId(null);
      setDueDate(defaultDueDate());
      setMaxMarks("20");
      setSubmissionType("text");
      setAssignmentStatus("published");
      await assignmentsQuery.refetch();
      Alert.alert("Assignment saved", "The assignment has been recorded.");
    },
    onError: (error) => Alert.alert("Assignment failed", getApiErrorMessage(error)),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!selectedAssignmentId) {
        throw new Error("Choose an assignment before submitting.");
      }
      return assignmentsService.createSubmission({
        assignment: selectedAssignmentId,
        content: submissionContent.trim(),
      });
    },
    onSuccess: async () => {
      setSelectedAssignmentId(null);
      setSubmissionContent("");
      await mySubmissionsQuery.refetch();
      Alert.alert("Submission saved", "Your assignment submission has been recorded.");
    },
    onError: (error) => Alert.alert("Submission failed", getApiErrorMessage(error)),
  });

  const gradeMutation = useMutation({
    mutationFn: (payload: { id: string; score: number; feedback?: string }) =>
      assignmentsService.gradeSubmission(payload.id, {
        score: payload.score,
        feedback: payload.feedback,
      }),
    onSuccess: async () => {
      setGradingSubmissionId(null);
      setGradeScore("");
      setGradeFeedback("");
      await teacherSubmissionsQuery.refetch();
      Alert.alert("Submission graded", "The score has been saved.");
    },
    onError: (error) => Alert.alert("Grading failed", getApiErrorMessage(error)),
  });

  const filteredAssignments = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = assignmentsQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }
    return rows.filter((entry) =>
      `${entry.title} ${entry.subject_name ?? ""} ${entry.teacher_name ?? ""} ${entry.target_class}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [assignmentsQuery.data?.results, deferredSearch]);

  const dueSoonCount = useMemo(() => {
    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
    return (assignmentsQuery.data?.results ?? []).filter((entry) => {
      const dueAt = new Date(entry.due_date).getTime();
      return Number.isFinite(dueAt) && dueAt >= now && dueAt <= nextWeek;
    }).length;
  }, [assignmentsQuery.data?.results]);

  const submissions = isTeacher
    ? teacherSubmissionsQuery.data?.results ?? []
    : mySubmissionsQuery.data?.results ?? [];
  const gradedCount = submissions.filter((entry) => entry.status === "graded").length;

  async function handleCreateAssignment() {
    if (!assignmentTitle.trim() || !selectedClass || !selectedSubjectId) {
      Alert.alert("Missing details", "Assignment title, class, and subject are required.");
      return;
    }

    const payload: CreateAssignmentRequest = {
      subject: selectedSubjectId,
      school_class: selectedClass.id,
      target_class: selectedClass.name,
      title: assignmentTitle.trim(),
      instructions: instructions.trim(),
      due_date: dueDate.trim() || defaultDueDate(),
      max_marks: Number.parseFloat(maxMarks) || 20,
      submission_type: submissionType,
      status: assignmentStatus,
    };

    if (!isOnline) {
      await enqueue("CREATE_ASSIGNMENT", payload, `Create assignment: ${payload.title}`);
      setCreateOpen(false);
      setAssignmentTitle("");
      setInstructions("");
      Alert.alert("Assignment saved", "The assignment has been recorded.");
      return;
    }

    createMutation.mutate(payload);
  }

  async function handleSubmitAssignment() {
    if (!selectedAssignmentId) {
      return;
    }
    if (!submissionContent.trim()) {
      Alert.alert("Missing submission", "Enter the assignment response before submitting.");
      return;
    }

    const payload = {
      assignment: selectedAssignmentId,
      content: submissionContent.trim(),
    };

    if (!isOnline) {
      await enqueue("SUBMIT_ASSIGNMENT", payload, "Submit assignment");
      setSelectedAssignmentId(null);
      setSubmissionContent("");
      Alert.alert("Submission saved", "Your assignment submission has been recorded.");
      return;
    }

    submitMutation.mutate();
  }

  async function handleGradeSubmission() {
    if (!gradingSubmissionId) {
      return;
    }
    const score = Number.parseFloat(gradeScore);
    if (!Number.isFinite(score)) {
      Alert.alert("Invalid score", "Enter a valid numeric score.");
      return;
    }

    const payload = {
      id: gradingSubmissionId,
      data: {
        score,
        feedback: gradeFeedback.trim(),
      },
    };

    if (!isOnline) {
      await enqueue("GRADE_ASSIGNMENT_SUBMISSION", payload, "Grade assignment submission");
      setGradingSubmissionId(null);
      setGradeScore("");
      setGradeFeedback("");
      Alert.alert("Submission graded", "The score has been recorded.");
      return;
    }

    gradeMutation.mutate({ id: gradingSubmissionId, score, feedback: gradeFeedback.trim() });
  }

  return (
    <Screen
      title="Assignments"
      subtitle={isTeacher ? "Create, track, and grade class assignments." : "Assignment instructions, deadlines, and submission history."}
      rightAction={isTeacher ? <AppButton compact label="New" onPress={() => setCreateOpen(true)} /> : undefined}
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Assignments" value={assignmentsQuery.data?.results?.length ?? 0} helper="Current assignment list for this account." />
        <StatCard label="Due Soon" value={dueSoonCount} helper="Assignments due within the next seven days." tone="warning" />
        <StatCard label={isTeacher ? "Submissions" : "My Submissions"} value={submissions.length} helper="Recorded assignment submissions." />
        <StatCard label="Graded" value={gradedCount} helper="Submissions already marked." tone="success" />
      </View>

      <Field
        label="Search Assignments"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title, subject, class, or teacher"
      />

      <SectionTitle title="Assignment Board" subtitle="Current assignments visible from the school backend." />
      {assignmentsQuery.isLoading && !assignmentsQuery.data ? (
        <LoadingState label="Loading assignments..." />
      ) : filteredAssignments.length ? (
        <View style={{ gap: 12 }}>
          {filteredAssignments.map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} />
                <Tag label={entry.submission_type} tone="success" />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{entry.title}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || "Subject pending"} - {entry.school_class_name || entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name || "Teacher pending"} - Due: {formatDateTime(entry.due_date)}
              </Text>
              {entry.instructions ? (
                <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.instructions}</Text>
              ) : null}
              {isStudent && entry.status === "published" ? (
                <AppButton
                  label="Submit Work"
                  variant="secondary"
                  onPress={() => {
                    setSelectedAssignmentId(entry.id);
                    setSubmissionContent("");
                  }}
                />
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No assignments found" description="The current assignment board does not match this search." />
      )}

      {isTeacher ? (
        <>
          <SectionTitle title="Submission Review" subtitle="Latest submissions ready for marking." />
          {teacherSubmissionsQuery.isLoading && !teacherSubmissionsQuery.data ? (
            <LoadingState label="Loading submissions..." />
          ) : submissions.length ? (
            <View style={{ gap: 12 }}>
              {submissions.slice(0, 20).map((entry) => (
                <Card key={entry.id}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag label={entry.status} tone={entry.status === "graded" ? "success" : "warning"} />
                    {entry.score !== undefined && entry.score !== null ? <Tag label={`Score ${entry.score}`} /> : null}
                  </View>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                    {entry.student_name || "Student"} - {entry.assignment_title || "Assignment"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.subject_name || "Subject pending"} - {entry.target_class || "Class pending"}
                  </Text>
                  {entry.content ? <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.content}</Text> : null}
                  <AppButton
                    label={entry.status === "graded" ? "Update Grade" : "Grade"}
                    variant="secondary"
                    onPress={() => {
                      setGradingSubmissionId(entry.id);
                      setGradeScore(entry.score !== undefined && entry.score !== null ? String(entry.score) : "");
                      setGradeFeedback(entry.feedback ?? "");
                    }}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No submissions yet" description="Student submissions will appear here." />
          )}
        </>
      ) : (
        <>
          <SectionTitle title="My Submission History" subtitle="Latest submissions already stored for this account." />
          {mySubmissionsQuery.isLoading && !mySubmissionsQuery.data ? (
            <LoadingState label="Loading submission history..." />
          ) : submissions.length ? (
            <View style={{ gap: 12 }}>
              {submissions.slice(0, 12).map((entry) => (
                <Card key={entry.id}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag label={entry.status} tone={entry.status === "graded" ? "success" : "warning"} />
                    {entry.score !== undefined && entry.score !== null ? <Tag label={`Score ${entry.score}`} /> : null}
                  </View>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                    {entry.assignment_title || "Assignment submission"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.subject_name || "Subject pending"} - {entry.target_class || "Class pending"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    Submitted: {formatDateTime(entry.created || entry.modified || new Date().toISOString())}
                  </Text>
                  {entry.feedback ? <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.feedback}</Text> : null}
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No submissions yet" description="Submissions recorded for this account will appear here." />
          )}
        </>
      )}

      <ModalSheet visible={createOpen} title="Create Assignment" onClose={() => setCreateOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Title" value={assignmentTitle} onChangeText={setAssignmentTitle} placeholder="Assignment title" />
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
            onChange={setSelectedSubjectId}
          />
          <Field label="Due Date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD or ISO date" />
          <Field label="Max Marks" value={maxMarks} onChangeText={setMaxMarks} keyboardType="numeric" placeholder="20" />
          <OptionChips
            label="Submission Type"
            options={submissionTypeOptions}
            value={submissionType}
            onChange={(value) => setSubmissionType(value as "text" | "file" | "both")}
          />
          <OptionChips
            label="Status"
            options={assignmentStatusOptions}
            value={assignmentStatus}
            onChange={(value) => setAssignmentStatus(value as "draft" | "published")}
          />
          <Field label="Instructions" value={instructions} onChangeText={setInstructions} placeholder="Assignment instructions" multiline />
          <AppButton label="Save Assignment" onPress={() => void handleCreateAssignment()} loading={createMutation.isPending} />
        </View>
      </ModalSheet>

      <ModalSheet visible={Boolean(selectedAssignmentId)} title="Submit Assignment" onClose={() => setSelectedAssignmentId(null)}>
        <View style={{ gap: 16 }}>
          <Field
            label="Submission"
            value={submissionContent}
            onChangeText={setSubmissionContent}
            placeholder="Write the assignment response or paste the answer here"
            multiline
          />
          <AppButton label="Send Submission" onPress={() => void handleSubmitAssignment()} loading={submitMutation.isPending} />
        </View>
      </ModalSheet>

      <ModalSheet visible={Boolean(gradingSubmissionId)} title="Grade Submission" onClose={() => setGradingSubmissionId(null)}>
        <View style={{ gap: 16 }}>
          <Field label="Score" value={gradeScore} onChangeText={setGradeScore} keyboardType="numeric" placeholder="Score" />
          <Field label="Feedback" value={gradeFeedback} onChangeText={setGradeFeedback} placeholder="Teacher feedback" multiline />
          <AppButton label="Save Grade" onPress={() => void handleGradeSubmission()} loading={gradeMutation.isPending} />
        </View>
      </ModalSheet>
    </Screen>
  );
}
