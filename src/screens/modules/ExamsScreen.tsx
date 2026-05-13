import { useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  Card,
  EmptyState,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { examsService } from "@/lib/api/services/exams.service";
import { formatDateTime } from "@/lib/utils/format";

export function ExamsScreen() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const examsQuery = useQuery({
    queryKey: ["exams", "list"],
    queryFn: () => examsService.getExams({ page_size: 100 }),
  });

  const resultsQuery = useQuery({
    queryKey: ["exams", "my-results"],
    queryFn: () => examsService.getMyResults({ page_size: 100 }),
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

  const stats = useMemo(() => {
    const rows = examsQuery.data?.results ?? [];
    return {
      active: rows.filter((entry) => !["COMPLETED", "CANCELLED"].includes(entry.status) || entry.is_live_now)
        .length,
      live: rows.filter((entry) => entry.is_live_now).length,
      graded: (resultsQuery.data?.results ?? []).filter((entry) => entry.status === "GRADED").length,
      submissions: resultsQuery.data?.results?.length ?? 0,
    };
  }, [examsQuery.data?.results, resultsQuery.data?.results]);

  return (
    <Screen
      title="Exams & Schedules"
      subtitle="Exam sessions, windows, results, and scheduling signals from the shared academic backend."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Exam Sessions" value={examsQuery.data?.results?.length ?? 0} helper="Current exam records visible to this account." />
        <StatCard label="Active" value={stats.active} helper="Exam sessions currently active or published." />
        <StatCard label="Live Now" value={stats.live} helper="Exams marked as live right now." tone="warning" />
        <StatCard label="My Results" value={stats.submissions} helper={`${stats.graded} submissions already graded.`} tone="success" />
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
                {entry.subject_name || "Subject pending"} • {entry.school_class_name || entry.target_class}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                {formatDateTime(entry.start_time)}
                {entry.end_time ? ` to ${formatDateTime(entry.end_time)}` : ""}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Teacher: {entry.teacher_name || "Teacher pending"} • Venue: {entry.venue || "Not specified"}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No exams found"
          description="No exam schedule item matches the current search."
        />
      )}

      <SectionTitle title="My Exam Results" subtitle="Submissions and grading already recorded for this account." />
      {resultsQuery.isLoading && !resultsQuery.data ? (
        <LoadingState label="Loading exam results..." />
      ) : (resultsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(resultsQuery.data?.results ?? []).slice(0, 12).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "GRADED" ? "success" : "warning"} />
                {entry.score !== undefined && entry.score !== null ? (
                  <Tag label={`Score ${entry.score}`} />
                ) : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                {entry.exam_title || entry.exam?.title || "Exam result"}
              </Text>
              <Text style={{ color: "#667085" }}>
                {entry.subject_name || entry.exam?.subject_name || "Subject pending"} • {entry.target_class || entry.exam?.target_class || "Class pending"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                Submitted: {entry.submitted_at ? formatDateTime(entry.submitted_at) : "Not submitted"}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No exam results yet"
          description="Exam submissions and grading records will appear here."
        />
      )}
    </Screen>
  );
}
