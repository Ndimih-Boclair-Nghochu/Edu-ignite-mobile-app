import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { aiService } from "@/lib/api/services/ai.service";
import { formatDateTime } from "@/lib/utils/format";

export function AIScreen() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["ai", "requests"],
    queryFn: () => aiService.getAIRequests({ page_size: 50 }),
  });

  const insightsQuery = useQuery({
    queryKey: ["ai", "insights"],
    queryFn: () => aiService.getAIInsights({ page_size: 20 }),
  });

  const platformInsightQuery = useQuery({
    queryKey: ["ai", "platform-insights"],
    queryFn: () => aiService.getPlatformInsights(),
  });

  const directChatMutation = useMutation({
    mutationFn: () => aiService.directChat(prompt.trim()),
    onSuccess: (response) => {
      setReply(response.reply);
      setPrompt("");
      void requestsQuery.refetch();
    },
    onError: (error) => Alert.alert("AI request failed", getApiErrorMessage(error)),
  });

  const completedCount = useMemo(
    () => (requestsQuery.data?.results ?? []).filter((entry) => entry.status === "completed").length,
    [requestsQuery.data?.results]
  );

  return (
    <Screen
      title="AI Assistant"
      subtitle="Institution insights, AI requests, and direct assistant responses from the shared EduIgnite intelligence backend."
    >
      <View style={{ gap: 12 }}>
        <StatCard label="AI Requests" value={requestsQuery.data?.results?.length ?? 0} helper="Recent AI requests logged for this account." />
        <StatCard label="Completed" value={completedCount} helper="AI requests already finished." tone="success" />
        <StatCard label="Insights" value={insightsQuery.data?.results?.length ?? 0} helper="Generated institution insights available now." />
        <StatCard label="Platform Insight" value={platformInsightQuery.data?.status || "ready"} helper="Latest institutional AI response." />
      </View>

      <Card>
        <SectionTitle title="Ask The Assistant" subtitle="Send a direct AI prompt from mobile." />
        <Field
          label="Prompt"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask about attendance, grades, planning, communication, or school operations"
          multiline
        />
        <AppButton
          label="Send Prompt"
          onPress={() => {
            if (!prompt.trim()) {
              Alert.alert("Missing prompt", "Enter a request for the assistant.");
              return;
            }
            directChatMutation.mutate();
          }}
          loading={directChatMutation.isPending}
        />
        {reply ? (
          <Card>
            <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>Latest Response</Text>
            <Text style={{ color: "#667085", lineHeight: 21 }}>{reply}</Text>
          </Card>
        ) : null}
      </Card>

      <SectionTitle title="Institution Insights" subtitle="Generated insight cards already available from the backend." />
      {insightsQuery.isLoading && !insightsQuery.data ? (
        <LoadingState label="Loading AI insights..." />
      ) : (insightsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(insightsQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.insight_type} />
                <Tag label={entry.target_role} tone="success" />
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>{entry.title}</Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.description}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No AI insights yet"
          description="Generated institutional insights will appear here once available."
        />
      )}

      <SectionTitle title="Recent AI Requests" subtitle="The latest AI work already recorded for this account." />
      {requestsQuery.isLoading && !requestsQuery.data ? (
        <LoadingState label="Loading AI requests..." />
      ) : (requestsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(requestsQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.request_type} />
                <Tag label={entry.status} tone={entry.status === "completed" ? "success" : "warning"} />
              </View>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.prompt}</Text>
              {entry.response ? (
                <Text style={{ color: "#102032", lineHeight: 20 }}>{entry.response}</Text>
              ) : null}
              <Text style={{ color: "#667085", fontSize: 12 }}>{formatDateTime(entry.created_at)}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No AI requests yet"
          description="AI requests made from this account will appear here."
        />
      )}
    </Screen>
  );
}
