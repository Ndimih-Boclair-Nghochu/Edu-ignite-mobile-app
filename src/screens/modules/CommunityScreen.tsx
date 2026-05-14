import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
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
  UserAvatar,
} from "@/components/ui";
import { isExecutiveRole, isSchoolAdminRole } from "@/features/roles";
import { getApiErrorMessage } from "@/lib/api/errors";
import { communityService } from "@/lib/api/services/community.service";
import { feedbackService } from "@/lib/api/services/feedback.service";
import { supportService } from "@/lib/api/services/support.service";
import { formatDateTime } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { palette } from "@/theme";

function paragraphsToText(paragraphs?: string[]) {
  return (paragraphs ?? []).join("\n\n");
}

function textToParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function CommunityScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageBlogs = isExecutiveRole(user?.role) || isSchoolAdminRole(user?.role);
  const canApproveTestimonies = isExecutiveRole(user?.role);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackPriority, setFeedbackPriority] = useState("Medium");

  const [blogOpen, setBlogOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogImage, setBlogImage] = useState("");

  const [testimonyOpen, setTestimonyOpen] = useState(false);
  const [testimonyMessage, setTestimonyMessage] = useState("");

  const blogsQuery = useQuery({
    queryKey: ["community", "blogs"],
    queryFn: () => communityService.getBlogs({ page_size: 20 }),
  });

  const testimoniesQuery = useQuery({
    queryKey: ["community", "testimonies"],
    queryFn: () => communityService.getTestimonies({ page_size: 20 }),
  });

  const pendingTestimoniesQuery = useQuery({
    queryKey: ["community", "testimonies", "pending"],
    queryFn: () => communityService.getPendingTestimonies({ page_size: 20 }),
    enabled: canApproveTestimonies,
  });

  const feedbackQuery = useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: () => feedbackService.getMyFeedbacks({ page_size: 50 }),
  });

  const supportQuery = useQuery({
    queryKey: ["support", "contributions"],
    queryFn: () => supportService.getSupportContributions({ page_size: 20 }),
  });

  const publishedBlogs = useMemo(
    () => (blogsQuery.data?.results ?? []).filter((entry) => entry.is_published !== false),
    [blogsQuery.data?.results]
  );

  const draftBlogs = useMemo(
    () => (blogsQuery.data?.results ?? []).filter((entry) => entry.is_published === false),
    [blogsQuery.data?.results]
  );

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
      await queryClient.invalidateQueries({ queryKey: ["feedback"] });
      Alert.alert("Feedback sent", "Your feedback has been submitted.");
    },
    onError: (error) => Alert.alert("Feedback failed", getApiErrorMessage(error)),
  });

  const createOrUpdateBlogMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: blogTitle.trim(),
        paragraphs: textToParagraphs(blogContent),
        image: blogImage.trim() || undefined,
      };
      return editingBlogId
        ? communityService.updateBlog(editingBlogId, payload)
        : communityService.createBlog(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community", "blogs"] });
      setBlogOpen(false);
      setEditingBlogId(null);
      setBlogTitle("");
      setBlogContent("");
      setBlogImage("");
      Alert.alert("Post saved", "The community post has been saved.");
    },
    onError: (error) => Alert.alert("Save failed", getApiErrorMessage(error)),
  });

  const publishBlogMutation = useMutation({
    mutationFn: (blogId: string) => communityService.publishBlog(blogId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community", "blogs"] });
      Alert.alert("Post published", "The post is now visible in the community feed.");
    },
    onError: (error) => Alert.alert("Publish failed", getApiErrorMessage(error)),
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (blogId: string) => communityService.deleteBlog(blogId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community", "blogs"] });
      Alert.alert("Post deleted", "The community post has been removed.");
    },
    onError: (error) => Alert.alert("Delete failed", getApiErrorMessage(error)),
  });

  const createTestimonyMutation = useMutation({
    mutationFn: () =>
      communityService.createTestimony({
        message: testimonyMessage.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community", "testimonies"] });
      setTestimonyOpen(false);
      setTestimonyMessage("");
      Alert.alert("Testimony submitted", "Your testimony is waiting for review.");
    },
    onError: (error) => Alert.alert("Submission failed", getApiErrorMessage(error)),
  });

  const approveTestimonyMutation = useMutation({
    mutationFn: (id: string) => communityService.approveTestimony(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["community", "testimonies"] }),
        queryClient.invalidateQueries({ queryKey: ["community", "testimonies", "pending"] }),
      ]);
      Alert.alert("Testimony approved", "The testimony is now public.");
    },
    onError: (error) => Alert.alert("Approval failed", getApiErrorMessage(error)),
  });

  const rejectTestimonyMutation = useMutation({
    mutationFn: (id: string) => communityService.rejectTestimony(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["community", "testimonies"] }),
        queryClient.invalidateQueries({ queryKey: ["community", "testimonies", "pending"] }),
      ]);
      Alert.alert("Testimony rejected", "The testimony has been declined.");
    },
    onError: (error) => Alert.alert("Rejection failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Community"
      subtitle="Community & support"
      rightAction={
        <View style={{ gap: 8 }}>
          {canManageBlogs ? (
            <AppButton
              compact
              label="New Post"
              onPress={() => {
                setEditingBlogId(null);
                setBlogTitle("");
                setBlogContent("");
                setBlogImage("");
                setBlogOpen(true);
              }}
            />
          ) : (
            <AppButton compact label="Testimony" onPress={() => setTestimonyOpen(true)} />
          )}
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Community Posts" value={publishedBlogs.length} helper="Published posts." />
        <StatCard label="Testimonies" value={testimoniesQuery.data?.results?.length ?? 0} helper="Visible community voices." />
        <StatCard label="My Feedback" value={feedbackQuery.data?.results?.length ?? 0} helper="Feedback tickets from this account." />
        <StatCard label="Support Records" value={supportQuery.data?.results?.length ?? 0} helper="Recent support activity." />
      </View>

      <SectionTitle title="Community Feed" />
      {blogsQuery.isLoading && !blogsQuery.data ? (
        <LoadingState label="Loading community posts..." />
      ) : publishedBlogs.length ? (
        <View style={{ gap: 12 }}>
          {publishedBlogs.map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar name={entry.author?.name || entry.senderName} uri={entry.author?.avatar || entry.senderAvatar} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                    {entry.title}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>
                    {(entry.author?.name || entry.senderName || "Community") + " • " + formatDateTime(entry.created_at || entry.createdAt?.toISOString() || new Date().toISOString())}
                  </Text>
                </View>
              </View>
              <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                {(entry.paragraphs ?? []).join(" ").slice(0, 320)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No community posts yet" description="Published posts will appear here." />
      )}

      {canManageBlogs ? (
        <>
          <SectionTitle title="Drafts" />
          {draftBlogs.length ? (
            <View style={{ gap: 12 }}>
              {draftBlogs.map((entry) => (
                <Card key={entry.id}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag label="Draft" tone="warning" />
                  </View>
                  <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                    {entry.title}
                  </Text>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    {(entry.paragraphs ?? []).join(" ").slice(0, 220)}
                  </Text>
                  <AppButton
                    label="Edit Draft"
                    variant="secondary"
                    onPress={() => {
                      setEditingBlogId(entry.id);
                      setBlogTitle(entry.title || "");
                      setBlogContent(paragraphsToText(entry.paragraphs));
                      setBlogImage(entry.image || "");
                      setBlogOpen(true);
                    }}
                  />
                  <AppButton
                    label="Publish"
                    onPress={() => publishBlogMutation.mutate(entry.id)}
                    loading={publishBlogMutation.isPending}
                  />
                  <AppButton
                    label="Delete"
                    variant="danger"
                    onPress={() => deleteBlogMutation.mutate(entry.id)}
                    loading={deleteBlogMutation.isPending}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No drafts" description="Unpublished posts will appear here." />
          )}
        </>
      ) : null}

      {canApproveTestimonies ? (
        <>
          <SectionTitle title="Pending Testimonies" />
          {(pendingTestimoniesQuery.data?.results ?? []).length ? (
            <View style={{ gap: 12 }}>
              {(pendingTestimoniesQuery.data?.results ?? []).map((entry) => (
                <Card key={entry.id}>
                  <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                    {entry.name || entry.author?.name || "Community member"}
                  </Text>
                  <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                    {entry.message}
                  </Text>
                  <AppButton
                    label="Approve"
                    onPress={() => approveTestimonyMutation.mutate(entry.id)}
                    loading={approveTestimonyMutation.isPending}
                  />
                  <AppButton
                    label="Reject"
                    variant="danger"
                    onPress={() => rejectTestimonyMutation.mutate(entry.id)}
                    loading={rejectTestimonyMutation.isPending}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No pending testimonies" description="Review items will appear here." />
          )}
        </>
      ) : null}

      <SectionTitle
        title="Feedback"
        rightAction={<AppButton compact label="Send" onPress={() => setFeedbackOpen(true)} />}
      />
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
              <Text style={{ fontWeight: "800", color: palette.text, fontSize: 15 }}>
                {entry.subject}
              </Text>
              <Text style={{ color: palette.textMuted, lineHeight: 20 }}>{entry.message}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No feedback yet" description="Feedback from this account will appear here." />
      )}

      <ModalSheet visible={feedbackOpen} title="Send Feedback" onClose={() => setFeedbackOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Subject" value={feedbackSubject} onChangeText={setFeedbackSubject} placeholder="Subject" />
          <Field label="Priority" value={feedbackPriority} onChangeText={setFeedbackPriority} placeholder="Low, Medium, High, Critical" />
          <Field label="Message" value={feedbackMessage} onChangeText={setFeedbackMessage} placeholder="Message" multiline />
          <AppButton
            label="Submit Feedback"
            onPress={() => createFeedbackMutation.mutate()}
            loading={createFeedbackMutation.isPending}
          />
        </View>
      </ModalSheet>

      <ModalSheet visible={blogOpen} title={editingBlogId ? "Edit Post" : "New Post"} onClose={() => setBlogOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Title" value={blogTitle} onChangeText={setBlogTitle} placeholder="Post title" />
          <Field label="Image URL" value={blogImage} onChangeText={setBlogImage} placeholder="https://..." />
          <Field label="Content" value={blogContent} onChangeText={setBlogContent} placeholder="Write the post content" multiline />
          <AppButton
            label={editingBlogId ? "Save Post" : "Create Post"}
            onPress={() => createOrUpdateBlogMutation.mutate()}
            loading={createOrUpdateBlogMutation.isPending}
          />
        </View>
      </ModalSheet>

      <ModalSheet visible={testimonyOpen} title="Submit Testimony" onClose={() => setTestimonyOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Message" value={testimonyMessage} onChangeText={setTestimonyMessage} placeholder="Share your testimony" multiline />
          <AppButton
            label="Submit Testimony"
            onPress={() => createTestimonyMutation.mutate()}
            loading={createTestimonyMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
