import { apiClient } from '../client';
import { API } from '../endpoints';
import { normalizeSchool } from '../normalizers';
import { resolveMediaUrl } from '@/lib/media';
import {
  School,
  SchoolSettings,
  PaginatedResponse,
  ListParams,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  PlatformStats,
  HierarchySubSchool,
  HierarchySubAdmin,
  HierarchyClass,
  HierarchyClassExplore,
  HierarchyClassSubject,
  User,
} from '../types';

export const schoolsService = {
  async getSchools(params?: ListParams): Promise<PaginatedResponse<School>> {
    const { data } = await apiClient.get(API.SCHOOLS.BASE, { params });
    return {
      ...data,
      results: (data?.results ?? []).map(normalizeSchool).filter(Boolean) as School[],
    };
  },

  async getSchool(id: string): Promise<School> {
    const { data } = await apiClient.get(API.SCHOOLS.DETAIL(id));
    return normalizeSchool(data) as School;
  },

  async getMySchool(): Promise<School> {
    const { data } = await apiClient.get(API.SCHOOLS.MY_SCHOOL);
    return normalizeSchool(data) as School;
  },

  async createSchool(schoolData: CreateSchoolRequest): Promise<School> {
    const { data } = await apiClient.post(API.SCHOOLS.BASE, schoolData);
    return normalizeSchool(data) as School;
  },

  async updateSchool(id: string, schoolData: UpdateSchoolRequest): Promise<School> {
    const { data } = await apiClient.patch(API.SCHOOLS.DETAIL(id), schoolData);
    return normalizeSchool(data) as School;
  },

  async uploadLogo(id: string, file: File): Promise<{ logo_url: string; logo: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await apiClient.post(`/schools/schools/${id}/upload-logo/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...data,
      logo_url: resolveMediaUrl(data?.logo_url),
      logo: resolveMediaUrl(data?.logo),
    };
  },

  async uploadBanner(id: string, file: File): Promise<{ banner_url: string; banner: string }> {
    const formData = new FormData();
    formData.append('banner', file);
    const { data } = await apiClient.post(`/schools/schools/${id}/upload-banner/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...data,
      banner_url: resolveMediaUrl(data?.banner_url),
      banner: resolveMediaUrl(data?.banner),
    };
  },

  async deleteSchool(id: string, confirmation?: { matricule: string; password: string }): Promise<void> {
    await apiClient.delete(API.SCHOOLS.DETAIL(id), { data: confirmation ?? {} });
  },

  async toggleSchoolStatus(id: string, body?: Record<string, unknown>): Promise<School> {
    const { data } = await apiClient.post(API.SCHOOLS.TOGGLE_STATUS(id), body ?? {});
    return normalizeSchool(data) as School;
  },

  async getSchoolStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.SCHOOLS.STATS);
    return data;
  },

  async getSchoolSettings(id: string): Promise<SchoolSettings> {
    const { data } = await apiClient.get(API.SCHOOLS.SETTINGS(id));
    return data;
  },

  async updateSchoolSettings(id: string, settings: Partial<SchoolSettings>): Promise<SchoolSettings> {
    const { data } = await apiClient.patch(API.SCHOOLS.SETTINGS(id), settings);
    return data;
  },

  async getHierarchyStaff(schoolId?: string): Promise<User[]> {
    const { data } = await apiClient.get(API.SCHOOLS.HIERARCHY_STAFF, { params: schoolId ? { school_id: schoolId } : undefined });
    return data?.results ?? data ?? [];
  },

  async getSubSchools(schoolId?: string): Promise<HierarchySubSchool[]> {
    const { data } = await apiClient.get(API.SCHOOLS.HIERARCHY_SUB_SCHOOLS, { params: schoolId ? { school_id: schoolId } : undefined });
    return data?.results ?? data ?? [];
  },

  async createSubSchool(payload: Partial<HierarchySubSchool> & { school_id?: string }): Promise<HierarchySubSchool> {
    const { data } = await apiClient.post(API.SCHOOLS.HIERARCHY_SUB_SCHOOLS, payload);
    return data;
  },

  async updateSubSchool(id: string, payload: Partial<HierarchySubSchool> & { school_id?: string }): Promise<HierarchySubSchool> {
    const { data } = await apiClient.patch(API.SCHOOLS.HIERARCHY_SUB_SCHOOL_DETAIL(id), payload);
    return data;
  },

  async deleteSubSchool(id: string): Promise<void> {
    await apiClient.delete(API.SCHOOLS.HIERARCHY_SUB_SCHOOL_DETAIL(id));
  },

  async getSubAdmins(schoolId?: string): Promise<HierarchySubAdmin[]> {
    const { data } = await apiClient.get(API.SCHOOLS.HIERARCHY_SUB_ADMINS, { params: schoolId ? { school_id: schoolId } : undefined });
    return data?.results ?? data ?? [];
  },

  async assignSubAdmin(payload: { staff: string; sub_school: string; school_id?: string }): Promise<HierarchySubAdmin> {
    const { data } = await apiClient.post(API.SCHOOLS.HIERARCHY_SUB_ADMINS, payload);
    return data;
  },

  async updateSubAdmin(id: string, payload: { sub_school: string; school_id?: string }): Promise<HierarchySubAdmin> {
    const { data } = await apiClient.patch(API.SCHOOLS.HIERARCHY_SUB_ADMIN_DETAIL(id), payload);
    return data;
  },

  async unassignSubAdmin(id: string): Promise<void> {
    await apiClient.delete(API.SCHOOLS.HIERARCHY_SUB_ADMIN_DETAIL(id));
  },

  async getHierarchyClasses(params?: { school_id?: string; sub_school?: string }): Promise<HierarchyClass[]> {
    const { data } = await apiClient.get(API.SCHOOLS.HIERARCHY_CLASSES, { params });
    return data?.results ?? data ?? [];
  },

  async createHierarchyClass(payload: Partial<HierarchyClass> & { school_id?: string }): Promise<HierarchyClass> {
    const { data } = await apiClient.post(API.SCHOOLS.HIERARCHY_CLASSES, payload);
    return data;
  },

  async updateHierarchyClass(id: string, payload: Partial<HierarchyClass> & { school_id?: string }): Promise<HierarchyClass> {
    const { data } = await apiClient.patch(API.SCHOOLS.HIERARCHY_CLASS_DETAIL(id), payload);
    return data;
  },

  async deleteHierarchyClass(id: string): Promise<void> {
    await apiClient.delete(API.SCHOOLS.HIERARCHY_CLASS_DETAIL(id));
  },

  async exploreHierarchyClass(id: string, schoolId?: string): Promise<HierarchyClassExplore> {
    const { data } = await apiClient.get(API.SCHOOLS.HIERARCHY_CLASS_EXPLORE(id), { params: schoolId ? { school_id: schoolId } : undefined });
    return data;
  },

  async getHierarchySubjects(params?: { school_id?: string; sub_school?: string; class_id?: string; type?: string }): Promise<HierarchyClassSubject[]> {
    const { data } = await apiClient.get(API.SCHOOLS.HIERARCHY_SUBJECTS, { params });
    return data?.results ?? data ?? [];
  },

  async createHierarchySubject(payload: Partial<HierarchyClassSubject> & { school_id?: string }): Promise<HierarchyClassSubject> {
    const { data } = await apiClient.post(API.SCHOOLS.HIERARCHY_SUBJECTS, payload);
    return data;
  },

  async updateHierarchySubject(id: string, payload: Partial<HierarchyClassSubject> & { school_id?: string }): Promise<HierarchyClassSubject> {
    const { data } = await apiClient.patch(API.SCHOOLS.HIERARCHY_SUBJECT_DETAIL(id), payload);
    return data;
  },

  async deleteHierarchySubject(id: string): Promise<void> {
    await apiClient.delete(API.SCHOOLS.HIERARCHY_SUBJECT_DETAIL(id));
  },
};
