import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
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
import { communityService } from "@/lib/api/services/community.service";
import { feedbackService } from "@/lib/api/services/feedback.service";
import { supportService } from "@/lib/api/services/support.service";
import { formatDateTime } from "@/lib/utils/format";

export function CommunityScreen() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackPriority, setFeedbackPriority] = useState("Medium");

  const blogsQuery = useQuery({
    queryKey: ["community", "blogs"],
    queryFn: () => communityService.getBlogs({ page_size: 20 }),
  });

  const testimoniesQuery = useQuery({
    queryKey: ["community", "testimonies"],
    queryFn: () => communityService.getTestimonies({ page_size: 20 }),
  });

  const feedbackQuery = useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: () => feedbackService.getMyFeedbacks({ page_size: 50 }),
  });

  const supportQuery = useQuery({
    queryKey: ["support", "contributions"],
    queryFn: () => supportService.getSupportContributions({ page_size: 20 }),
  });

  const feedbackStatsQuery = useQuery({
    queryKey: ["feedback", "stats"],
    queryFn: () => feedbackService.getFeedbackStats(),
  });

  const createFeedbackMutation = useMutation({
    mutationFn: () =>
      feedbackService.createFeedback({
        subject: feedbackSubject.trim(),
        message: feedbackMessage.trim(),
        priority: feedbackPriority as "Low" | "Medium" | "High" | "Critical",
      }),
    onSuccess: async () => {
      setFeedbackOpen(false);
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackPriority("Medium");
      await Promise.all([feedbackQuery.refetch(), feedbackStatsQuery.refetch()]);
      Alert.alert("Feedback sent", "Your feedback has been submitted.");
    },
    onError: (error) => Alert.alert("Feedback failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Community & Support"
      subtitle="Institution stories, support activity, and feedback channels backed by the shared platform services."
      rightAction={<AppButton compact label="Send Feedback" onPress={() => setFeedbackOpen(true)} />}
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Community Posts" value={blogsQuery.data?.results?.length ?? 0} helper="Recent community blog posts." />
        <StatCard label="Testimonies" value={testimoniesQuery.data?.results?.length ?? 0} helper="Published testimonies visible to the platform." />
        <StatCard label="My Feedback" value={feedbackQuery.data?.results?.length ?? 0} helper="Feedback items submitted from this account." />
        <StatCard label="Support Records" value={supportQuery.data?.results?.length ?? 0} helper="Recent platform support contributions." />
      </View>

      <SectionTitle title="Community Blog" subtitle="Latest platform and school community posts." />
      {blogsQuery.isLoading && !blogsQuery.data ? (
        <LoadingState label="Loading community posts..." />
      ) : (blogsQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(blogsQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>{entry.title}</Text>
              <Text style={{ color: "#667085" }}>
                {entry.author?.name || entry.senderName || "Community"} • {formatDateTime(entry.created_at || entry.createdAt?.toISOString() || new Date().toISOString())}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                {(entry.paragraphs ?? []).slice(0, 2).join(" ").slice(0, 220) || "Open the web workspace for the full article body."}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No community posts yet" description="Community stories will appear here once published." />
      )}

      <SectionTitle title="Feedback History" subtitle="Issues, ideas, and improvement requests submitted from this account." />
      {feedbackQuery.isLoading && !feedbackQuery.data ? (
        <LoadingState label="Loading feedback..." />
      ) : (feedbackQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(feedbackQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "Resolved" ? "success" : "warning"} />
                {entry.priority ? <Tag label={entry.priority} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>{entry.subject}</Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.message}</Text>
              <Text style={{ color: "#667085", fontSize: 12 }}>
                {formatDateTime(entry.created_at || new Date().toISOString())}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No feedback yet" description="Feedback submitted from this account will appear here." />
      )}

      <SectionTitle title="Support Contributions" subtitle="Recent platform support activity visible from the backend." />
      {supportQuery.isLoading && !supportQuery.data ? (
        <LoadingState label="Loading support activity..." />
      ) : (supportQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(supportQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "Verified" ? "success" : "warning"} />
                {entry.payment_method || entry.method ? <Tag label={entry.payment_method || entry.method || "Method"} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                {entry.user?.name || entry.userName || "Supporter"}
              </Text>
              <Text style={{ color: "#667085" }}>
                Amount: {entry.amount} • Phone: {entry.phone}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{entry.message}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No support records" description="Support contributions will appear here once available." />
      )}

      <ModalSheet visible={feedbackOpen} title="Send Feedback" onClose={() => setFeedbackOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field
            label="Subject"
            value={feedbackSubject}
            onChangeText={setFeedbackSubject}
            placeholder="What needs attention?"
          />
          <Field
            label="Priority"
            value={feedbackPriority}
            onChangeText={setFeedbackPriority}
            placeholder="Low, Medium, High, or Critical"
          />
          <Field
            label="Message"
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            placeholder="Describe the issue or suggestion"
            multiline
          />
          <AppButton
            label="Submit Feedback"
            onPress={() => createFeedbackMutation.mutate()}
            loading={createFeedbackMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
