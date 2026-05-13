import { RouteProp, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { AppButton, Card, Field, LoadingState, Screen, Tag } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { chatService } from "@/lib/api/services/chat.service";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useSync } from "@/providers/SyncProvider";

export function ConversationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Conversation">>();
  const { conversationId } = route.params;
  const { enqueue, isOnline, queue } = useSync();
  const [text, setText] = useState("");

  const conversationQuery = useQuery({
    queryKey: ["chat", "conversation", conversationId],
    queryFn: () => chatService.getConversation(conversationId),
    enabled: Boolean(conversationId),
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => chatService.getMessages(conversationId, { limit: 100 }),
    enabled: Boolean(conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { text: string }) =>
      chatService.sendMessage({ conversation_id: conversationId, text: payload.text }),
    onSuccess: async () => {
      setText("");
      await messagesQuery.refetch();
    },
    onError: (error) => {
      Alert.alert("Message not sent", getApiErrorMessage(error));
    },
  });

  useEffect(() => {
    if (isOnline) {
      void chatService.markConversationRead({ id: conversationId }).catch(() => undefined);
    }
  }, [conversationId, isOnline]);

  async function handleSend() {
    if (!text.trim()) {
      return;
    }

    if (!isOnline) {
      await enqueue(
        "SEND_MESSAGE",
        { conversation_id: conversationId, text: text.trim() },
        `Send queued chat message to ${route.params.title ?? "conversation"}`
      );
      setText("");
      Alert.alert("Queued offline", "The message will sync once the device reconnects.");
      return;
    }

    sendMutation.mutate({ text: text.trim() });
  }

  const queuedForConversation = queue.filter(
    (item) =>
      item.type === "SEND_MESSAGE" &&
      (item.payload.conversation_id ?? item.payload.conversationId) === conversationId
  );

  return (
    <Screen
      title={route.params.title ?? "Conversation"}
      subtitle="Messages stay connected to the shared EduIgnite chat backend."
    >
      {conversationQuery.isLoading && !conversationQuery.data ? (
        <LoadingState label="Loading conversation..." />
      ) : null}

      {queuedForConversation.length ? (
        <Card>
          <Tag label={`${queuedForConversation.length} queued message${queuedForConversation.length > 1 ? "s" : ""}`} tone="warning" />
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            Some replies were captured offline and are waiting to sync.
          </Text>
        </Card>
      ) : null}

      {messagesQuery.isLoading && !messagesQuery.data ? (
        <LoadingState label="Loading messages..." />
      ) : (
        <ScrollView
          style={{ maxHeight: 420 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {(messagesQuery.data?.results ?? []).map((message) => {
            const mine = message.sender?.id === conversationQuery.data?.participants?.[0]?.id;
            return (
              <Card
                key={message.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  backgroundColor: mine ? "#264D73" : "#FFFFFF",
                  maxWidth: "88%",
                }}
              >
                <Text
                  style={{
                    color: mine ? "#FFFFFF" : "#102032",
                    fontWeight: "700",
                  }}
                >
                  {message.sender?.name || "User"}
                </Text>
                <Text style={{ color: mine ? "#F7FBFD" : "#667085", lineHeight: 20 }}>
                  {message.text}
                </Text>
                <Text
                  style={{
                    color: mine ? "rgba(255,255,255,0.7)" : "#667085",
                    fontSize: 11,
                  }}
                >
                  {formatDateTime(message.created_at)}
                </Text>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Card>
        <Field
          label="Reply"
          value={text}
          onChangeText={setText}
          placeholder="Write a response"
          multiline
        />
        <AppButton label={isOnline ? "Send Message" : "Queue Message"} onPress={() => void handleSend()} loading={sendMutation.isPending} />
      </Card>
    </Screen>
  );
}
