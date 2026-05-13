import { apiClient } from '../client';
import { API } from '../endpoints';
import { normalizePlatformSettings } from '../normalizers';
import { resolveMediaUrl } from '@/lib/media';
import {
  PlatformSettings,
  PublicEvent,
  PlatformStats,
  ListParams,
  PaginatedResponse,
} from '../types';

const isFormDataPayload = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

export const platformService = {
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data } = await apiClient.get(API.PLATFORM.SETTINGS);
    return normalizePlatformSettings(data);
  },

  async updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const { data } = await apiClient.patch(API.PLATFORM.SETTINGS, settings);
    return normalizePlatformSettings(data);
  },

  async uploadLogo(file: File): Promise<{ logo_url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await apiClient.post(API.PLATFORM.UPLOAD_LOGO, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...data,
      logo_url: resolveMediaUrl(data?.logo_url),
    };
  },

  async uploadEventMedia(file: File): Promise<{ media_url: string; media_type: "video" | "image" }> {
    const formData = new FormData();
    formData.append('media', file);
    const { data } = await apiClient.post(API.PLATFORM.UPLOAD_EVENT_MEDIA, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...data,
      media_url: resolveMediaUrl(data?.media_url),
    };
  },

  async getPlatformFees(params?: ListParams): Promise<PaginatedResponse<any>> {
    const { data } = await apiClient.get(API.PLATFORM.FEES, { params });
    return data;
  },

  async updateFee(id: string, feeData: any): Promise<any> {
    const { data } = await apiClient.patch(`${API.PLATFORM.FEES}${id}/`, feeData);
    return data;
  },

  async createFee(feeData: { role: string; amount: number; currency?: string }): Promise<any> {
    const { data } = await apiClient.post(API.PLATFORM.FEES, feeData);
    return data;
  },

  async getPublicEvents(params?: ListParams): Promise<PaginatedResponse<PublicEvent>> {
    const { data } = await apiClient.get(API.PLATFORM.EVENTS, { params });
    return data;
  },

  async createEvent(eventData: Partial<PublicEvent> | FormData): Promise<PublicEvent> {
    const config = isFormDataPayload(eventData)
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
    const { data } = await apiClient.post(API.PLATFORM.EVENTS, eventData, config);
    return data;
  },

  async createPublicEvent(eventData: Partial<PublicEvent> | FormData): Promise<PublicEvent> {
    return this.createEvent(eventData);
  },

  async updateEvent(id: string, eventData: Partial<PublicEvent> | FormData): Promise<PublicEvent> {
    const config = isFormDataPayload(eventData)
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
    const { data } = await apiClient.patch(API.PLATFORM.EVENT_DETAIL(id), eventData, config);
    return data;
  },

  async updatePublicEvent(id: string, eventData: Partial<PublicEvent> | FormData): Promise<PublicEvent> {
    return this.updateEvent(id, eventData);
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(API.PLATFORM.EVENT_DETAIL(id));
  },

  async deletePublicEvent(id: string): Promise<void> {
    return this.deleteEvent(id);
  },

  async getPlatformStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.PLATFORM.STATS);
    return data;
  },

  async getTutorials(): Promise<Record<string, string>> {
    const { data } = await apiClient.get(API.PLATFORM.TUTORIALS);
    return data;
  },
};
