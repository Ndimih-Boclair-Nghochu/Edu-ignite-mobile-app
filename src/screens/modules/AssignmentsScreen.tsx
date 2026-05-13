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
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { assignmentsService } from "@/lib/api/services/assignments.service";
import { formatDateTime } from "@/lib/utils/format";

export function AssignmentsScreen() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");

  const assignmentsQuery = useQuery({
    queryKey: ["assignments", "list"],
    queryFn: () => assignmentsService.getAssignments({ page_size: 100, ordering: "-due_date" }),
  });

  const mySubmissionsQuery = useQuery({
    queryKey: ["assignments", "my-submissions"],
    queryFn: () => assignmentsService.getMySubmissions({ page_size: 100 }),
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

  const gradedCount = useMemo(
    () => (mySubmissionsQuery.data?.results ?? []).filter((entry) => entry.status === "graded").length,
    [mySubmissionsQuery.data?.results]
  );

  return (
    <Screen
      title="Assignments"
      subtitle="Assignment instructions, deadlines, and submission history backed by the same academic backend."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Assignments" value={assignmentsQuery.data?.results?.length ?? 0} helper="Current assignment list available to this account." />
        <StatCard label="Due Soon" value={dueSoonCount} helper="Assignments due within the next seven days." tone="warning" />
        <StatCard label="My Submissions" value={mySubmissionsQuery.data?.results?.length ?? 0} helper="Recorded submissions for this account." />
        <StatCard label="Graded" value={gradedCount} helper="Submissions already marked by the teacher." tone="success" />
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
                {entry.subject_name || "Subject pending"} • {entry.school_class_name || entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name || "Teacher pending"} • Due: {formatDateTime(entry.due_date)}
              </Text>
              {entry.instructions ? (
                <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.instructions}</Text>
              ) : null}
              <AppButton
                label="Submit Work"
                variant="secondary"
                onPress={() => {
                  setSelectedAssignmentId(entry.id);
                  setSubmissionContent("");
                }}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No assignments found"
          description="The current assignment board does not match this search."
        />
      )}

      <SectionTitle title="My Submission History" subtitle="Latest submissions already stored for this account." />
      {mySubmissionsQuery.isLoading && !mySubmissionsQuery.data ? (
        <LoadingState label="Loading submission history..." />
      ) : (mySubmissionsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(mySubmissionsQuery.data?.results ?? []).slice(0, 12).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "graded" ? "success" : "warning"} />
                {entry.score !== undefined && entry.score !== null ? (
                  <Tag label={`Score ${entry.score}`} />
                ) : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                {entry.assignment_title || "Assignment submission"}
              </Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || "Subject pending"} • {entry.target_class || "Class pending"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Submitted: {formatDateTime(entry.created || entry.modified || new Date().toISOString())}
              </Text>
              {entry.feedback ? (
                <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.feedback}</Text>
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No submissions yet"
          description="Submissions recorded for this account will appear here."
        />
      )}

      <ModalSheet
        visible={Boolean(selectedAssignmentId)}
        title="Submit Assignment"
        onClose={() => setSelectedAssignmentId(null)}
      >
        <View style={{ gap: 16 }}>
          <Field
            label="Submission"
            value={submissionContent}
            onChangeText={setSubmissionContent}
            placeholder="Write the assignment response or paste the answer here"
            multiline
          />
          <AppButton
            label="Send Submission"
            onPress={() => submitMutation.mutate()}
            loading={submitMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
