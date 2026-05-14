import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Send,
} from "lucide-react-native";
import { UserAvatar } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { chatService } from "@/lib/api/services/chat.service";
import { Message } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, formatRole } from "@/lib/utils/format";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";
import { palette, theme } from "@/theme";

type PendingMessage = Message & {
  pending: true;
};

export function ConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Conversation">>();
  const scrollRef = useRef<ScrollView | null>(null);
  const { conversationId } = route.params;
  const { user } = useAuth();
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
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    },
    onError: (error) => {
      Alert.alert("Message not sent", getApiErrorMessage(error));
    },
  });

  React.useEffect(() => {
    if (isOnline) {
      void chatService.markConversationRead({ id: conversationId }).catch(() => undefined);
    }
  }, [conversationId, isOnline]);

  const pendingMessages = useMemo<PendingMessage[]>(() => {
    if (!user) {
      return [];
    }

    return queue.flatMap((action) => {
      if (action.type !== "SEND_MESSAGE") {
        return [];
      }

      const actionConversationId =
        action.payload.conversation_id ?? action.payload.conversationId;
      if (actionConversationId !== conversationId) {
        return [];
      }

      return [
        {
          id: action.id,
          conversation: conversationId,
          sender: user,
          text: action.payload.text,
          message_type: "text",
          is_official: false,
          is_read: false,
          created_at: action.createdAt,
          is_deleted: false,
          pending: true,
        },
      ];
    });
  }, [conversationId, queue, user]);

  const mergedMessages = useMemo(() => {
    const serverMessages = messagesQuery.data?.results ?? [];
    return [...serverMessages, ...pendingMessages].sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  }, [messagesQuery.data?.results, pendingMessages]);

  const counterpart = useMemo(() => {
    const participants = conversationQuery.data?.participants ?? [];
    return participants.find((participant) => participant.id !== user?.id) ?? participants[0];
  }, [conversationQuery.data?.participants, user?.id]);

  async function handleSend() {
    if (!text.trim()) {
      return;
    }

    if (!isOnline) {
      await enqueue(
        "SEND_MESSAGE",
        { conversation_id: conversationId, text: text.trim() },
        `Send chat message to ${route.params.title ?? "conversation"}`
      );
      setText("");
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      return;
    }

    sendMutation.mutate({ text: text.trim() });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.safeArea}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={palette.primary} size={20} />
          </Pressable>
          <UserAvatar
            name={counterpart?.name || route.params.title}
            uri={counterpart?.avatar}
            size={46}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {counterpart?.name || route.params.title || "Conversation"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {counterpart?.role ? formatRole(counterpart.role) : "Messages"}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {(conversationQuery.isLoading || messagesQuery.isLoading) &&
          !conversationQuery.data &&
          !messagesQuery.data ? (
            <Text style={styles.loadingText}>Loading conversation...</Text>
          ) : null}

          {mergedMessages.map((message) => {
            const mine = message.sender?.id === user?.id;
            const pending = "pending" in message && Boolean(message.pending);

            return (
              <View
                key={message.id}
                style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    mine ? styles.messageBubbleMine : styles.messageBubbleOther,
                  ]}
                >
                  {!mine ? (
                    <Text style={styles.senderName}>{message.sender?.name || "User"}</Text>
                  ) : null}
                  <Text
                    style={[styles.messageText, mine ? styles.messageTextMine : styles.messageTextOther]}
                  >
                    {message.text}
                  </Text>
                  <View style={styles.messageMeta}>
                    <Text
                      style={[
                        styles.messageTime,
                        mine ? styles.messageTimeMine : styles.messageTimeOther,
                      ]}
                    >
                      {formatDateTime(message.created_at)}
                    </Text>
                    {mine ? (
                      pending ? (
                        <Clock3 color="rgba(255,255,255,0.74)" size={13} />
                      ) : message.is_read ? (
                        <CheckCheck color="rgba(255,255,255,0.86)" size={14} />
                      ) : (
                        <Check color="rgba(255,255,255,0.74)" size={14} />
                      )
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composerShell}>
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={() => void handleSend()}
              style={({ pressed }) => [
                styles.sendButton,
                pressed ? styles.sendButtonPressed : null,
              ]}
            >
              <Send color={palette.surface} size={18} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(38,77,115,0.08)",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accent,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.textMuted,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    gap: 10,
  },
  loadingText: {
    color: palette.textMuted,
    textAlign: "center",
    paddingVertical: 24,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "84%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  messageBubbleMine: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: 8,
  },
  messageBubbleOther: {
    backgroundColor: palette.surface,
    borderBottomLeftRadius: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.primary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextMine: {
    color: palette.surface,
  },
  messageTextOther: {
    color: palette.text,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeMine: {
    color: "rgba(255,255,255,0.74)",
  },
  messageTimeOther: {
    color: palette.textMuted,
  },
  composerShell: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: palette.background,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(38,77,115,0.08)",
  },
  input: {
    flex: 1,
    minHeight: 24,
    maxHeight: 120,
    color: palette.text,
    fontSize: 15,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  sendButtonPressed: {
    opacity: 0.92,
  },
});
