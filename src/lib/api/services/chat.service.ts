import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  normalizeConversation,
  normalizeMessage,
  normalizeUser,
} from '../normalizers';
import { normalizePaginatedResponse } from '../normalize';
import {
  Conversation,
  Message,
  PaginatedResponse,
  ListParams,
  RelatedChatUser,
  SendMessageRequest,
  TeacherGroupClassOption,
  CreateTeacherGroupRequest,
} from '../types';

export const chatService = {
  async getConversations(params?: ListParams): Promise<PaginatedResponse<Conversation>> {
    const { data } = await apiClient.get(API.CHAT.CONVERSATIONS, { params });
    const normalized = normalizePaginatedResponse<Conversation>(data);
    return {
      ...normalized,
      results: normalized.results.map((conversation) =>
        normalizeConversation(conversation as Record<string, any>)
      ),
    };
  },

  async getConversation(id: string): Promise<Conversation> {
    const { data } = await apiClient.get(API.CHAT.CONVERSATION_DETAIL(id));
    return normalizeConversation(data);
  },

  async getOrCreateDirect(userIdOrPayload: string | { userId: string }): Promise<Conversation> {
    const userId = typeof userIdOrPayload === 'string' ? userIdOrPayload : userIdOrPayload.userId;
    const { data } = await apiClient.post(API.CHAT.DIRECT, { user_id: userId });
    return normalizeConversation(data);
  },

  async getRelatedUsers(): Promise<RelatedChatUser[]> {
    const { data } = await apiClient.get(API.CHAT.RELATED_USERS);
    const rows = Array.isArray(data) ? data : data?.results ?? [];
    return rows.map((user: Record<string, any>) => normalizeUser(user) as RelatedChatUser);
  },

  async getTeacherGroupOptions(): Promise<TeacherGroupClassOption[]> {
    const { data } = await apiClient.get(API.CHAT.TEACHER_GROUP_OPTIONS);
    return Array.isArray(data) ? data : data?.results ?? [];
  },

  async createTeacherGroup(payload: CreateTeacherGroupRequest): Promise<Conversation> {
    const { data } = await apiClient.post(API.CHAT.CREATE_TEACHER_GROUP, payload);
    return normalizeConversation(data);
  },

  async getMessages(
    conversationId: string,
    params?: ListParams
  ): Promise<PaginatedResponse<Message>> {
    const { data } = await apiClient.get(API.CHAT.MESSAGES(conversationId), { params });
    const normalized = normalizePaginatedResponse<Message>(data);
    return {
      ...normalized,
      results: normalized.results.map((message) =>
        normalizeMessage(message as Record<string, any>)
      ),
    };
  },

  async sendMessage(
    conversationIdOrPayload: string | SendMessageRequest,
    maybeMessageData?: SendMessageRequest
  ): Promise<Message> {
    const conversationId =
      typeof conversationIdOrPayload === 'string'
        ? conversationIdOrPayload
        : conversationIdOrPayload.conversation_id ?? conversationIdOrPayload.conversationId ?? '';
    const messageData =
      typeof conversationIdOrPayload === 'string' ? maybeMessageData : conversationIdOrPayload;
    const { data } = await apiClient.post(API.CHAT.MESSAGES_BASE, {
      ...messageData,
      conversation_id: conversationId,
    });
    return normalizeMessage(data);
  },

  async markConversationRead(
    conversationIdOrPayload: string | { id: string }
  ): Promise<Conversation> {
    const conversationId =
      typeof conversationIdOrPayload === 'string'
        ? conversationIdOrPayload
        : conversationIdOrPayload.id;
    const { data } = await apiClient.post(API.CHAT.MARK_READ(conversationId), {});
    return normalizeConversation(data);
  },

  async updateConversationSettings(conversationId: string, payload: Partial<Conversation>): Promise<Conversation> {
    const { data } = await apiClient.patch(API.CHAT.SETTINGS(conversationId), payload);
    return normalizeConversation(data);
  },

  async addParticipant(conversationId: string, userId: string): Promise<any> {
    const { data } = await apiClient.post(API.CHAT.ADD_PARTICIPANT(conversationId), { user_id: userId });
    return data;
  },

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await apiClient.post(API.CHAT.REMOVE_PARTICIPANT(conversationId), { user_id: userId });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(API.CHAT.DELETE_MESSAGE(messageId));
  },
};
