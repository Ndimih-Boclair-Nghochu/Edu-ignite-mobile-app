import { apiClient } from '../client';
import { API } from '../endpoints';
import { normalizePaginatedResponse } from '../normalize';
import {
  Student,
  ParentStudentLink,
  StudentRegistrySummary,
  PaginatedResponse,
  ListParams,
  CreateStudentRequest,
  BulkStudentUploadRequest,
  LinkParentRequest,
} from '../types';

export const studentsService = {
  async getStudents(params?: ListParams): Promise<PaginatedResponse<Student>> {
    const { data } = await apiClient.get(API.STUDENTS.BASE, { params });
    return normalizePaginatedResponse(data);
  },

  async getMyProfile(): Promise<Student> {
    const { data } = await apiClient.get(API.STUDENTS.ME);
    return data;
  },

  async getStudent(id: string): Promise<Student> {
    const { data } = await apiClient.get(API.STUDENTS.DETAIL(id));
    return data;
  },

  async createStudent(studentData: CreateStudentRequest): Promise<Student> {
    const { data } = await apiClient.post(API.STUDENTS.BASE, studentData);
    return data;
  },

  async bulkUploadStudents(payload: BulkStudentUploadRequest): Promise<any> {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.sub_school) formData.append('sub_school', payload.sub_school);
      if (payload.school_class) formData.append('school_class', payload.school_class);
      formData.append('student_class', payload.student_class);
      if (payload.class_level) formData.append('class_level', payload.class_level);
      if (payload.section) formData.append('section', payload.section);
      if (payload.department) formData.append('department', payload.department);
      if (payload.stream) formData.append('stream', payload.stream);
      if (payload.batch_name) formData.append('batch_name', payload.batch_name);
      if (payload.admission_date) formData.append('admission_date', payload.admission_date);
      if (payload.guardian_name) formData.append('guardian_name', payload.guardian_name);
      if (payload.guardian_phone) formData.append('guardian_phone', payload.guardian_phone);
      if (payload.guardian_whatsapp) formData.append('guardian_whatsapp', payload.guardian_whatsapp);
      const { data } = await apiClient.post(API.STUDENTS.BULK_UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }

    const { data } = await apiClient.post(API.STUDENTS.BULK_UPLOAD, {
      sub_school: payload.sub_school,
      school_class: payload.school_class,
      student_class: payload.student_class,
      generation_count: payload.generation_count,
      class_level: payload.class_level,
      section: payload.section,
      department: payload.department,
      stream: payload.stream,
      batch_name: payload.batch_name,
      admission_date: payload.admission_date,
      guardian_name: payload.guardian_name,
      guardian_phone: payload.guardian_phone,
      guardian_whatsapp: payload.guardian_whatsapp,
    });
    return data;
  },

  async updateStudent(id: string, studentData: Partial<CreateStudentRequest>): Promise<Student> {
    const { data } = await apiClient.patch(API.STUDENTS.DETAIL(id), studentData);
    return data;
  },

  async getHonourRoll(params?: ListParams): Promise<PaginatedResponse<Student>> {
    const { data } = await apiClient.get(API.STUDENTS.HONOUR_ROLL, { params });
    return normalizePaginatedResponse(data);
  },

  async getRegistrySummary(): Promise<StudentRegistrySummary> {
    const { data } = await apiClient.get(API.STUDENTS.REGISTRY_SUMMARY);
    return data;
  },

  async getMyChildren(params?: ListParams): Promise<PaginatedResponse<Student>> {
    const { data } = await apiClient.get(API.STUDENTS.MY_CHILDREN, { params });
    return normalizePaginatedResponse(data);
  },

  async getClassList(className: string): Promise<Student[]> {
    const { data } = await apiClient.get(API.STUDENTS.CLASS_LIST(className));
    return data;
  },

  async linkParent(
    studentId: string,
    parentIdOrPayload: string | LinkParentRequest,
    relationship?: string
  ): Promise<any> {
    const payload =
      typeof parentIdOrPayload === 'string'
        ? { parent_id: parentIdOrPayload, relationship }
        : {
            parent_id: parentIdOrPayload.parentId,
            relationship: parentIdOrPayload.relationship,
            parent_name: parentIdOrPayload.parent_name,
            parent_email: parentIdOrPayload.parent_email,
            parent_phone: parentIdOrPayload.parent_phone,
            parent_whatsapp: parentIdOrPayload.parent_whatsapp,
            is_primary: parentIdOrPayload.is_primary,
          };
    const { data } = await apiClient.post(API.STUDENTS.LINK_PARENT(studentId), {
      ...payload,
    });
    return data;
  },

  async getStudentCard(id: string): Promise<any> {
    const { data } = await apiClient.get(API.STUDENTS.STUDENT_CARD(id));
    return data;
  },

  async getParentLinks(params?: ListParams): Promise<PaginatedResponse<ParentStudentLink>> {
    const { data } = await apiClient.get(API.STUDENTS.PARENT_LINKS, { params });
    return normalizePaginatedResponse(data);
  },

  async downloadAdmissionForm(id: string): Promise<Blob> {
    const { data } = await apiClient.get(API.STUDENTS.ADMISSION_FORM(id), {
      responseType: 'blob',
    });
    return data;
  },
};
