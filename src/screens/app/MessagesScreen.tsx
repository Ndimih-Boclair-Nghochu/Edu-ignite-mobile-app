import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { AppButton, Card, EmptyState, Field, LoadingState, Screen, SectionTitle, Tag, UserAvatar } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { chatService } from "@/lib/api/services/chat.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, formatRole } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useSync } from "@/providers/SyncProvider";

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
      navigation.navigate("Conversation", {
        conversationId: conversation.id,
        title: relatedUser?.name ?? conversation.name ?? "Conversation",
      });
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
      const participantNames = conversation.participants.map((participant) => participant.name).join(" ");
      const haystack = `${conversation.name ?? ""} ${conversation.last_message ?? ""} ${participantNames}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [conversationsQuery.data?.results, deferredSearch]);

  return (
    <Screen
      title="Messages"
      subtitle="Direct and group conversations, with queued replies continuing offline."
    >
      <Field
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, message, or group title"
      />

      <SectionTitle
        title="Quick Contacts"
        subtitle="Open a direct conversation with the users already related to this account."
      />
      {relatedUsersQuery.isLoading && !relatedUsersQuery.data ? (
        <LoadingState label="Loading chat contacts..." />
      ) : (relatedUsersQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(relatedUsersQuery.data ?? []).slice(0, 6).map((person) => (
            <Card key={person.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar name={person.name} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 15 }}>
                    {person.name}
                  </Text>
                  <Text style={{ color: "#667085" }}>{formatRole(person.role)}</Text>
                </View>
                <AppButton
                  compact
                  label="Chat"
                  onPress={() => {
                    if (!isOnline) {
                      Alert.alert(
                        "Offline",
                        "Opening a new direct conversation requires connectivity once. Existing conversations still open from cache."
                      );
                      return;
                    }
                    createDirectMutation.mutate(person.id);
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No related users yet"
          description="Direct contacts will appear here once the backend returns the connected school or family relationships."
        />
      )}

      <SectionTitle
        title="Conversation Inbox"
        subtitle="The latest cached or live chat threads for this account."
      />
      {conversationsQuery.isLoading && !conversationsQuery.data ? (
        <LoadingState label="Loading conversations..." />
      ) : filteredConversations.length ? (
        <View style={{ gap: 12 }}>
          {filteredConversations.map((conversation) => (
            <Card key={conversation.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar
                  name={
                    conversation.name ??
                    conversation.participants.map((participant) => participant.name).join(" ")
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {conversation.name ||
                      conversation.participants.map((participant) => participant.name).join(", ")}
                  </Text>
                  <Text style={{ color: "#667085", lineHeight: 19 }}>
                    {conversation.last_message || "No message preview yet"}
                  </Text>
                  <Text style={{ color: "#667085", fontSize: 12, marginTop: 6 }}>
                    {formatDateTime(conversation.last_message_at)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={conversation.conversation_type} />
                <Tag label={`${conversation.unread_count ?? 0} unread`} tone="warning" />
              </View>
              <AppButton
                label="Open Conversation"
                variant="secondary"
                onPress={() =>
                  navigation.navigate("Conversation", {
                    conversationId: conversation.id,
                    title:
                      conversation.name ||
                      conversation.participants.map((participant) => participant.name).join(", "),
                  })
                }
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No conversations match"
          description="Try another search or start a direct chat from the quick contacts section."
        />
      )}
    </Screen>
  );
}
