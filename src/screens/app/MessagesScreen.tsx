import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
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
import { chatService } from "@/lib/api/services/chat.service";
import { Conversation, RelatedChatUser } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, formatRole } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useSync } from "@/providers/SyncProvider";
import { palette, theme } from "@/theme";

export function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const conversationsQuery = useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => chatService.getConversations({ limit: 100 }),
  });

  const relatedUsersQuery = useQuery({
    queryKey: queryKeys.chat.relatedUsers,
    queryFn: () => chatService.getRelatedUsers(),
  });

  const createDirectMutation = useMutation({
    mutationFn: (userId: string) => chatService.getOrCreateDirect(userId),
    onSuccess: (conversation, userId) => {
      const relatedUser = (relatedUsersQuery.data ?? []).find((entry) => entry.id === userId);
      openConversation(conversation, relatedUser?.name ?? conversation.name ?? "Conversation");
    },
    onError: (error) => {
      Alert.alert("Could not open chat", getApiErrorMessage(error));
    },
  });

  const filteredConversations = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = conversationsQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }

    return rows.filter((conversation) => {
      const participantNames = conversation.participants
        .map((participant) => participant.name)
        .join(" ");
      const haystack = `${conversation.name ?? ""} ${conversation.last_message ?? ""} ${participantNames}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [conversationsQuery.data?.results, deferredSearch]);

  function openConversation(conversation: Conversation, title: string) {
    navigation.navigate("Conversation", {
      conversationId: conversation.id,
      title,
    });
  }

  function findDirectConversation(person: RelatedChatUser) {
    return (conversationsQuery.data?.results ?? []).find(
      (conversation) =>
        conversation.conversation_type === "direct" &&
        conversation.participants.some((participant) => participant.id === person.id)
    );
  }

  function handleDirectOpen(person: RelatedChatUser) {
    const existingConversation = findDirectConversation(person);
    if (existingConversation) {
      openConversation(existingConversation, person.name);
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Chat unavailable",
        "Open this conversation online once so it can stay available on this device."
      );
      return;
    }

    createDirectMutation.mutate(person.id);
  }

  return (
    <Screen title="Messages" subtitle="Conversations">
      <Field
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search chats or people"
      />

      <SectionTitle title="People" />
      {relatedUsersQuery.isLoading && !relatedUsersQuery.data ? (
        <LoadingState label="Loading people..." />
      ) : (relatedUsersQuery.data ?? []).length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.peopleRow}>
            {(relatedUsersQuery.data ?? []).map((person) => (
              <Pressable
                key={person.id}
                onPress={() => handleDirectOpen(person)}
                style={({ pressed }) => [
                  styles.personChip,
                  pressed ? styles.pressed : null,
                ]}
              >
                <UserAvatar name={person.name} uri={person.avatar} size={58} />
                <Text numberOfLines={1} style={styles.personName}>
                  {person.name}
                </Text>
                <Text numberOfLines={1} style={styles.personRole}>
                  {formatRole(person.role)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <EmptyState title="No people yet" description="Related contacts will appear here." />
      )}

      <SectionTitle title="Chats" />
      {conversationsQuery.isLoading && !conversationsQuery.data ? (
        <LoadingState label="Loading chats..." />
      ) : filteredConversations.length ? (
        <View style={{ gap: 10 }}>
          {filteredConversations.map((conversation) => {
            const conversationTitle =
              conversation.name ||
              conversation.participants.map((participant) => participant.name).join(", ");
            const initialsName = conversation.name || conversationTitle;

            return (
              <Pressable
                key={conversation.id}
                onPress={() => openConversation(conversation, conversationTitle)}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
              >
                <Card style={styles.chatRow}>
                  <UserAvatar name={initialsName} size={58} />
                  <View style={styles.chatMeta}>
                    <View style={styles.chatTopRow}>
                      <Text numberOfLines={1} style={styles.chatTitle}>
                        {conversationTitle}
                      </Text>
                      <Text style={styles.chatTime}>
                        {formatDateTime(conversation.last_message_at)}
                      </Text>
                    </View>
                    <View style={styles.chatBottomRow}>
                      <Text numberOfLines={2} style={styles.chatPreview}>
                        {conversation.last_message || "No message yet"}
                      </Text>
                      {(conversation.unread_count ?? 0) > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {conversation.unread_count}
                          </Text>
                        </View>
                      ) : (
                        <Tag label={conversation.conversation_type} />
                      )}
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState title="No chats found" description="Your conversation history will appear here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  peopleRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingVertical: 4,
  },
  personChip: {
    width: 96,
    alignItems: "center",
    gap: 8,
  },
  personName: {
    fontSize: 13,
    fontWeight: "800",
    color: palette.text,
    textAlign: "center",
    width: "100%",
  },
  personRole: {
    fontSize: 11,
    color: palette.textMuted,
    textAlign: "center",
    width: "100%",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  chatMeta: {
    flex: 1,
    gap: 8,
  },
  chatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: palette.text,
  },
  chatTime: {
    fontSize: 11,
    color: palette.textMuted,
  },
  chatBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatPreview: {
    flex: 1,
    color: palette.textMuted,
    lineHeight: 19,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.secondary,
  },
  unreadText: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.9,
  },
});
