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
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { announcementsService } from "@/lib/api/services/announcements.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const targetOptions = [
  { label: "All", value: "all" },
  { label: "Students", value: "students" },
  { label: "Teachers", value: "teachers" },
  { label: "Parents", value: "parents" },
];

export function AnnouncementsScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("all");

  const canCompose = ["SCHOOL_ADMIN", "SUB_ADMIN", "TEACHER", "BURSAR", "LIBRARIAN"].includes(
    user?.role ?? ""
  );

  const announcementsQuery = useQuery({
    queryKey: queryKeys.announcements.feed({ limit: 100 }),
    queryFn: () => announcementsService.getMyAnnouncementFeed({ limit: 100 }),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (payload: { title: string; content: string; target: string }) =>
      announcementsService.createAnnouncement(payload),
    onSuccess: async () => {
      setComposeOpen(false);
      setTitle("");
      setContent("");
      setTarget("all");
      await announcementsQuery.refetch();
      Alert.alert("Announcement created", "The notice has been sent through the shared backend.");
    },
    onError: (error) => Alert.alert("Could not create announcement", getApiErrorMessage(error)),
  });

  const filteredAnnouncements = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = announcementsQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }
    return rows.filter((announcement) =>
      `${announcement.title} ${announcement.content}`.toLowerCase().includes(keyword)
    );
  }, [announcementsQuery.data?.results, deferredSearch]);

  async function handleCreateAnnouncement() {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Missing details", "Announcement title and content are required.");
      return;
    }

    const payload = { title: title.trim(), content: content.trim(), target };
    if (!isOnline) {
      await enqueue("CREATE_ANNOUNCEMENT", payload, `Create announcement: ${title.trim()}`);
      setComposeOpen(false);
      setTitle("");
      setContent("");
      setTarget("all");
      Alert.alert("Queued offline", "The announcement will publish when the device reconnects.");
      return;
    }

    createAnnouncementMutation.mutate(payload);
  }

  return (
    <Screen
      title="Announcements"
      subtitle="Role-targeted school notices, pinned messages, and mobile-safe composition."
      rightAction={
        canCompose ? (
          <AppButton compact label="Compose" onPress={() => setComposeOpen(true)} />
        ) : undefined
      }
    >
      <HeroCard
        eyebrow="School Notices"
        title="Live + Cached Announcement Feed"
        description="Each notice comes from the same backend stream shared with the web platform, and new ones can be queued offline for later publishing."
      />

      <Field
        label="Search Announcements"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title or content"
      />

      <SectionTitle title="Announcement Feed" subtitle="Pinned and recent notices for this account." />
      {announcementsQuery.isLoading && !announcementsQuery.data ? (
        <LoadingState label="Loading announcements..." />
      ) : filteredAnnouncements.length ? (
        <View style={{ gap: 12 }}>
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={announcement.target} />
                {announcement.is_pinned ? <Tag label="Pinned" tone="success" /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {announcement.title}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 21 }}>{announcement.content}</Text>
              <Text style={{ color: "#667085", fontSize: 12 }}>
                {formatDateTime(announcement.created_at)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No announcements found"
          description="No cached or live notice matches this search."
        />
      )}

      <ModalSheet visible={composeOpen} title="Create Announcement" onClose={() => setComposeOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Notice title" />
          <OptionChips label="Audience" options={targetOptions} value={target} onChange={setTarget} />
          <Field
            label="Content"
            value={content}
            onChangeText={setContent}
            placeholder="Write the announcement"
            multiline
          />
          <AppButton
            label={isOnline ? "Publish Announcement" : "Queue Announcement"}
            onPress={() => void handleCreateAnnouncement()}
            loading={createAnnouncementMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
