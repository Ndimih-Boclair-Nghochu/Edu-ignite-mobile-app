import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Tag,
  UserAvatar,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { communityService } from "@/lib/api/services/community.service";
import { formatDateTime } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { palette } from "@/theme";

function normalizeParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function LogPostScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [content, setContent] = useState("");

  const blogsQuery = useQuery({
    queryKey: ["community", "blogs", "log-post"],
    queryFn: () => communityService.getBlogs({ page_size: 30 }),
  });

  const myPosts = useMemo(
    () =>
      (blogsQuery.data?.results ?? []).filter((entry) => {
        const authorId = entry.author?.id;
        return authorId ? authorId === user?.id : entry.senderName === user?.name;
      }),
    [blogsQuery.data?.results, user?.id, user?.name]
  );

  const createMutation = useMutation({
    mutationFn: () => {
      const paragraphs = normalizeParagraphs(content);
      if (!title.trim()) {
        throw new Error("Enter the post title.");
      }
      if (!paragraphs.length) {
        throw new Error("Write at least one paragraph.");
      }
      return communityService.createBlog({
        title: title.trim(),
        image: image.trim() || undefined,
        paragraphs,
      });
    },
    onSuccess: async () => {
      setTitle("");
      setImage("");
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["community", "blogs"] });
      Alert.alert("Post published", "The strategic log has been sent to the community feed.");
    },
    onError: (error) => Alert.alert("Publish failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Log Post"
      subtitle="Executive publishing"
    >
      <Card>
        <SectionTitle title="Publish Strategic Log" subtitle="Create a board or platform update from mobile." />
        <Field
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Q3 pedagogical direction"
        />
        <Field
          label="Image URL"
          value={image}
          onChangeText={setImage}
          placeholder="https://..."
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="Content"
          value={content}
          onChangeText={setContent}
          placeholder="Write the post content. Separate paragraphs with a blank line."
          multiline
        />
        <AppButton
          label="Publish Log"
          onPress={() => createMutation.mutate()}
          loading={createMutation.isPending}
        />
      </Card>

      <SectionTitle title="Latest Executive Posts" subtitle="Posts authored by this account." />
      {blogsQuery.isLoading && !blogsQuery.data ? (
        <LoadingState label="Loading posts..." />
      ) : myPosts.length ? (
        <View style={{ gap: 12 }}>
          {myPosts.map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar
                  name={entry.author?.name || entry.senderName || user?.name}
                  uri={entry.author?.avatar || entry.senderAvatar || user?.avatar}
                  size={44}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                    {entry.title}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>
                    {formatDateTime(entry.created_at || entry.createdAt?.toISOString() || new Date().toISOString())}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.is_published === false ? "Draft" : "Published"} tone={entry.is_published === false ? "warning" : "success"} />
              </View>
              <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                {(entry.paragraphs ?? []).join(" ").slice(0, 320)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No executive posts yet" description="Your published strategic logs will appear here." />
      )}
    </Screen>
  );
}
