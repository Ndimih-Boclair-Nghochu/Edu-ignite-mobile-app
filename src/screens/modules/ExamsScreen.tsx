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
import { examsService } from "@/lib/api/services/exams.service";
import { gradesService } from "@/lib/api/services/grades.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import type { CreateExamRequest, ExamQuestion } from "@/lib/api/types";
import { formatDateTime } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const examModeOptions = [
  { label: "Onsite", value: "ONSITE" },
  { label: "Online", value: "ONLINE" },
];

const examStatusOptions = [
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Draft", value: "DRAFT" },
];

function defaultExamStart() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export function ExamsScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState("Sequence");
  const [examMode, setExamMode] = useState<"ONSITE" | "ONLINE">("ONSITE");
  const [examStatus, setExamStatus] = useState<"DRAFT" | "SCHEDULED">("SCHEDULED");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(defaultExamStart());
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [venue, setVenue] = useState("Classroom");
  const [passMark, setPassMark] = useState("10");
  const [instructions, setInstructions] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionOptions, setQuestionOptions] = useState("");
  const [correctOption, setCorrectOption] = useState("0");
  const [questionMarks, setQuestionMarks] = useState("1");
  const [draftQuestions, setDraftQuestions] = useState<ExamQuestion[]>([]);
  const [takingExamId, setTakingExamId] = useState<string | null>(null);
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});

  const examsQuery = useQuery({
    queryKey: ["exams", "list", user?.role],
    queryFn: () => examsService.getExams({ page_size: 100, ordering: "-start_time" }),
    enabled: Boolean(user),
  });

  const resultsQuery = useQuery({
    queryKey: ["exams", "my-results"],
    queryFn: () => examsService.getMyResults({ page_size: 100, ordering: "-submitted_at" }),
    enabled: isStudent,
  });

  const submissionsQuery = useQuery({
    queryKey: ["exams", "teacher-submissions"],
    queryFn: () => examsService.getSubmissions({ page_size: 100, ordering: "-submitted_at" }),
    enabled: isTeacher,
  });

  const classesQuery = useQuery({
    queryKey: ["exams", "classes"],
    queryFn: () => schoolsService.getHierarchyClasses(),
    enabled: isTeacher,
  });

  const subjectsQuery = useQuery({
    queryKey: ["exams", "subjects"],
    queryFn: () => gradesService.getSubjects({ page_size: 300 }),
    enabled: isTeacher,
  });

  const selectedClass = useMemo(
    () => (classesQuery.data ?? []).find((entry) => entry.id === selectedClassId) ?? null,
    [classesQuery.data, selectedClassId]
  );

  const selectedExam = useMemo(
    () => (examsQuery.data?.results ?? []).find((entry) => entry.id === takingExamId) ?? null,
    [examsQuery.data?.results, takingExamId]
  );

  const createExamMutation = useMutation({
    mutationFn: (payload: CreateExamRequest) => examsService.createExam(payload),
    onSuccess: async () => {
      resetCreateForm();
      await examsQuery.refetch();
      Alert.alert("Exam saved", "The exam has been recorded.");
    },
    onError: (error) => Alert.alert("Exam save failed", getApiErrorMessage(error)),
  });

  const submitExamMutation = useMutation({
    mutationFn: (payload: { exam: string; answers: Record<string, number> }) =>
      examsService.createSubmission(payload),
    onSuccess: async () => {
      setTakingExamId(null);
      setAnswerMap({});
      await resultsQuery.refetch();
      Alert.alert("Exam submitted", "Your exam submission has been recorded.");
    },
    onError: (error) => Alert.alert("Exam submission failed", getApiErrorMessage(error)),
  });

  const filteredExams = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = examsQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }
    return rows.filter((entry) =>
      `${entry.title} ${entry.subject_name ?? ""} ${entry.teacher_name ?? ""} ${entry.target_class ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [deferredSearch, examsQuery.data?.results]);

  const resultRows = resultsQuery.data?.results ?? [];
  const teacherSubmissionRows = submissionsQuery.data?.results ?? [];
  const stats = useMemo(() => {
    const rows = examsQuery.data?.results ?? [];
    const submissions = isTeacher ? teacherSubmissionRows : resultRows;
    return {
      active: rows.filter((entry) => !["COMPLETED", "CANCELLED"].includes(entry.status) || entry.is_live_now).length,
      live: rows.filter((entry) => entry.is_live_now).length,
      graded: submissions.filter((entry) => entry.status === "GRADED").length,
      submissions: submissions.length,
    };
  }, [examsQuery.data?.results, isTeacher, resultRows, teacherSubmissionRows]);

  function resetCreateForm() {
    setCreateOpen(false);
    setExamTitle("");
    setExamType("Sequence");
    setExamMode("ONSITE");
    setExamStatus("SCHEDULED");
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setStartTime(defaultExamStart());
    setDurationMinutes("60");
    setVenue("Classroom");
    setPassMark("10");
    setInstructions("");
    setDraftQuestions([]);
    setQuestionText("");
    setQuestionOptions("");
    setCorrectOption("0");
    setQuestionMarks("1");
  }

  function addDraftQuestion() {
    const options = questionOptions
      .split("|")
      .map((option) => option.trim())
      .filter(Boolean);
    const correct = Number.parseInt(correctOption, 10);
    if (!questionText.trim() || options.length < 2 || correct < 0 || correct >= options.length) {
      Alert.alert("Question incomplete", "Enter a question, at least two options, and a valid correct option number.");
      return;
    }

    setDraftQuestions((current) => [
      ...current,
      {
        order: current.length + 1,
        text: questionText.trim(),
        options,
        correct_option: correct,
        marks: Number.parseInt(questionMarks, 10) || 1,
      },
    ]);
    setQuestionText("");
    setQuestionOptions("");
    setCorrectOption("0");
    setQuestionMarks("1");
  }

  async function handleCreateExam() {
    if (!examTitle.trim() || !selectedClass) {
      Alert.alert("Missing details", "Exam title and class are required.");
      return;
    }
    if (examMode === "ONSITE" && !venue.trim()) {
      Alert.alert("Venue required", "Onsite exams require a venue.");
      return;
    }
    if (examMode === "ONLINE" && !draftQuestions.length) {
      Alert.alert("Questions required", "Online exams require at least one question.");
      return;
    }

    const payload: CreateExamRequest = {
      title: examTitle.trim(),
      exam_type: examType.trim() || "Sequence",
      mode: examMode,
      target_class: selectedClass.name,
      school_class: selectedClass.id,
      subject: selectedSubjectId,
      instructions: instructions.trim(),
      venue: examMode === "ONSITE" ? venue.trim() : "",
      start_time: startTime.trim() || defaultExamStart(),
      duration_minutes: Number.parseInt(durationMinutes, 10) || 60,
      status: examStatus,
      pass_mark: Number.parseFloat(passMark) || 10,
      allow_review: true,
      questions: examMode === "ONLINE" ? draftQuestions : [],
    };

    if (!isOnline) {
      await enqueue("CREATE_EXAM", payload, `Create exam: ${payload.title}`);
      resetCreateForm();
      Alert.alert("Exam saved", "The exam has been recorded.");
      return;
    }

    createExamMutation.mutate(payload);
  }

  async function handleSubmitExam() {
    if (!selectedExam) {
      return;
    }
    const answers: Record<string, number> = {};
    for (const question of selectedExam.questions ?? []) {
      if (!question.id) {
        continue;
      }
      const answer = answerMap[question.id];
      if (answer === undefined) {
        Alert.alert("Answer required", "Answer every question before submitting.");
        return;
      }
      answers[question.id] = Number.parseInt(answer, 10);
    }

    const payload = { exam: selectedExam.id, answers };
    if (!isOnline) {
      await enqueue("SUBMIT_EXAM", payload, `Submit exam: ${selectedExam.title}`);
      setTakingExamId(null);
      setAnswerMap({});
      Alert.alert("Exam submitted", "Your exam submission has been recorded.");
      return;
    }

    submitExamMutation.mutate(payload);
  }

  return (
    <Screen
      title="Exams & Schedules"
      subtitle={isTeacher ? "Create exam sessions and monitor submissions." : "Exam sessions, windows, and results."}
      rightAction={isTeacher ? <AppButton compact label="New" onPress={() => setCreateOpen(true)} /> : undefined}
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Exam Sessions" value={examsQuery.data?.results?.length ?? 0} helper="Current exam records visible to this account." />
        <StatCard label="Active" value={stats.active} helper="Exam sessions currently active or published." />
        <StatCard label="Live Now" value={stats.live} helper="Exams marked as live right now." tone="warning" />
        <StatCard label={isTeacher ? "Submissions" : "My Results"} value={stats.submissions} helper={`${stats.graded} submissions already graded.`} tone="success" />
      </View>

      <Field
        label="Search Exams"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title, subject, class, or teacher"
      />

      <SectionTitle title="Exam Schedule" subtitle="Current exams and timetable windows." />
      {examsQuery.isLoading && !examsQuery.data ? (
        <LoadingState label="Loading exams..." />
      ) : filteredExams.length ? (
        <View style={{ gap: 12 }}>
          {filteredExams.map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.is_live_now ? "warning" : "default"} />
                <Tag label={entry.mode} />
                <Tag label={entry.exam_type} tone="success" />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{entry.title}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || "Subject pending"} - {entry.school_class_name || entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                {formatDateTime(entry.start_time)}
                {entry.end_time ? ` to ${formatDateTime(entry.end_time)}` : ""}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name || "Teacher pending"} - Venue: {entry.venue || "Online"}
              </Text>
              {isStudent && entry.mode === "ONLINE" && entry.is_live_now && (entry.questions?.length ?? 0) > 0 ? (
                <AppButton
                  label="Take Exam"
                  variant="secondary"
                  onPress={() => {
                    setTakingExamId(entry.id);
                    setAnswerMap({});
                  }}
                />
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No exams found" description="No exam schedule item matches the current search." />
      )}

      {isTeacher ? (
        <>
          <SectionTitle title="Exam Submissions" subtitle="Submissions visible for your exams and subjects." />
          {submissionsQuery.isLoading && !submissionsQuery.data ? (
            <LoadingState label="Loading exam submissions..." />
          ) : teacherSubmissionRows.length ? (
            <View style={{ gap: 12 }}>
              {teacherSubmissionRows.slice(0, 20).map((entry) => (
                <Card key={entry.id}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag label={entry.status} tone={entry.status === "GRADED" ? "success" : "warning"} />
                    {entry.percentage !== undefined && entry.percentage !== null ? <Tag label={`${entry.percentage}%`} /> : null}
                  </View>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                    {entry.student_name || "Student"} - {entry.exam_title || entry.exam?.title || "Exam"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.subject_name || entry.exam?.subject_name || "Subject pending"} - {entry.target_class || entry.exam?.target_class || "Class pending"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    Score: {entry.score ?? 0} / {entry.total_marks ?? 0}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No exam submissions" description="Online exam submissions will appear here." />
          )}
        </>
      ) : (
        <>
          <SectionTitle title="My Exam Results" subtitle="Submissions and grading already recorded for this account." />
          {resultsQuery.isLoading && !resultsQuery.data ? (
            <LoadingState label="Loading exam results..." />
          ) : resultRows.length ? (
            <View style={{ gap: 12 }}>
              {resultRows.slice(0, 12).map((entry) => (
                <Card key={entry.id}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag label={entry.status} tone={entry.status === "GRADED" ? "success" : "warning"} />
                    {entry.score !== undefined && entry.score !== null ? <Tag label={`Score ${entry.score}`} /> : null}
                  </View>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                    {entry.exam_title || entry.exam?.title || "Exam result"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {entry.subject_name || entry.exam?.subject_name || "Subject pending"} - {entry.target_class || entry.exam?.target_class || "Class pending"}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 20 }}>
                    Submitted: {entry.submitted_at ? formatDateTime(entry.submitted_at) : "Not submitted"}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No exam results yet" description="Exam submissions and grading records will appear here." />
          )}
        </>
      )}

      <ModalSheet visible={createOpen} title="Create Exam" onClose={() => setCreateOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Title" value={examTitle} onChangeText={setExamTitle} placeholder="Exam title" />
          <Field label="Exam Type" value={examType} onChangeText={setExamType} placeholder="Sequence, Mock, Test" />
          <OptionChips
            label="Mode"
            options={examModeOptions}
            value={examMode}
            onChange={(value) => setExamMode(value as "ONSITE" | "ONLINE")}
          />
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
          <Field label="Start Time" value={startTime} onChangeText={setStartTime} placeholder="YYYY-MM-DD or ISO date" />
          <Field label="Duration Minutes" value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="numeric" placeholder="60" />
          <Field label="Pass Mark" value={passMark} onChangeText={setPassMark} keyboardType="numeric" placeholder="10" />
          {examMode === "ONSITE" ? (
            <Field label="Venue" value={venue} onChangeText={setVenue} placeholder="Classroom" />
          ) : null}
          <OptionChips
            label="Status"
            options={examStatusOptions}
            value={examStatus}
            onChange={(value) => setExamStatus(value as "DRAFT" | "SCHEDULED")}
          />
          <Field label="Instructions" value={instructions} onChangeText={setInstructions} placeholder="Exam instructions" multiline />

          {examMode === "ONLINE" ? (
            <Card>
              <SectionTitle title="Questions" subtitle={`${draftQuestions.length} question${draftQuestions.length === 1 ? "" : "s"} added.`} />
              <Field label="Question" value={questionText} onChangeText={setQuestionText} placeholder="Question text" multiline />
              <Field label="Options" value={questionOptions} onChangeText={setQuestionOptions} placeholder="Option A | Option B | Option C" />
              <Field label="Correct Option" value={correctOption} onChangeText={setCorrectOption} keyboardType="numeric" placeholder="0" />
              <Field label="Marks" value={questionMarks} onChangeText={setQuestionMarks} keyboardType="numeric" placeholder="1" />
              <AppButton label="Add Question" variant="secondary" onPress={addDraftQuestion} />
            </Card>
          ) : null}

          <AppButton label="Save Exam" onPress={() => void handleCreateExam()} loading={createExamMutation.isPending} />
        </View>
      </ModalSheet>

      <ModalSheet visible={Boolean(selectedExam)} title={selectedExam?.title || "Take Exam"} onClose={() => setTakingExamId(null)}>
        <View style={{ gap: 16 }}>
          {(selectedExam?.questions ?? []).map((question) => {
            const questionKey = question.id ?? String(question.order);
            return (
              <Card key={questionKey}>
                <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                  {question.order}. {question.text}
                </Text>
                <OptionChips
                  label="Answer"
                  options={(question.options ?? []).map((option, index) => ({
                    label: option,
                    value: String(index),
                  }))}
                  value={answerMap[questionKey]}
                  onChange={(value) => setAnswerMap((current) => ({ ...current, [questionKey]: value }))}
                />
              </Card>
            );
          })}
          <AppButton label="Submit Exam" onPress={() => void handleSubmitExam()} loading={submitExamMutation.isPending} />
        </View>
      </ModalSheet>
    </Screen>
  );
}
