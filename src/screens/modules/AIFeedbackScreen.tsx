import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  AppButton,
  Card,
  Field,
  Screen,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { aiService } from "@/lib/api/services/ai.service";
import { palette } from "@/theme";

function buildFeedbackPrompt(input: {
  studentName: string;
  className: string;
  grades: string;
  attendance: string;
  context: string;
}) {
  return [
    "You are an experienced teacher writing a constructive, professional student feedback note.",
    "Write one polished paragraph suitable for a school portal.",
    "Balance strengths, concerns, and one practical improvement suggestion.",
    `Student: ${input.studentName}`,
    `Class: ${input.className}`,
    `Recent grades: ${input.grades}`,
    `Attendance percentage: ${input.attendance}`,
    `Additional classroom context: ${input.context || "None provided"}`,
  ].join("\n");
}

export function AIFeedbackScreen() {
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [grades, setGrades] = useState("");
  const [attendance, setAttendance] = useState("90");
  const [context, setContext] = useState("");
  const [response, setResponse] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!studentName.trim()) {
        throw new Error("Enter the student name.");
      }
      const prompt = buildFeedbackPrompt({
        studentName: studentName.trim(),
        className: className.trim() || "Current class",
        grades: grades.trim() || "No detailed grades supplied",
        attendance: attendance.trim() || "0",
        context: context.trim(),
      });
      return aiService.directChat(prompt);
    },
    onSuccess: (payload) => {
      setResponse(payload.reply);
    },
    onError: (error) => Alert.alert("Generation failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="AI Feedback"
      subtitle="Teacher drafting"
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Student Name" value={studentName || "Pending"} helper="Target learner for this feedback draft." />
        <StatCard label="Class" value={className || "Pending"} helper="Class or stream the learner belongs to." />
      </View>

      <Card>
        <SectionTitle title="Student Input" subtitle="Provide the classroom details used to generate the note." />
        <Field
          label="Student Name"
          value={studentName}
          onChangeText={setStudentName}
          placeholder="Student name"
        />
        <Field
          label="Class"
          value={className}
          onChangeText={setClassName}
          placeholder="Form 4 Science"
        />
        <Field
          label="Recent Grades"
          value={grades}
          onChangeText={setGrades}
          placeholder="Math: 15/20, English: 13/20, Physics: 16/20"
          multiline
        />
        <Field
          label="Attendance (%)"
          value={attendance}
          onChangeText={setAttendance}
          placeholder="92"
          keyboardType="numeric"
        />
        <Field
          label="Additional Context"
          value={context}
          onChangeText={setContext}
          placeholder="Participation, behavior, strengths, concerns..."
          multiline
        />
        <AppButton
          label="Generate Feedback"
          onPress={() => generateMutation.mutate()}
          loading={generateMutation.isPending}
        />
      </Card>

      <Card>
        <SectionTitle title="Generated Draft" subtitle="AI response ready for teacher review." />
        <Text style={{ color: palette.textMuted, lineHeight: 22 }}>
          {response || "The generated feedback draft will appear here."}
        </Text>
      </Card>
    </Screen>
  );
}
