import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  AIRequest,
  AIInsight,
  PaginatedResponse,
  ListParams,
} from '../types';

export const aiService = {
  async getAIRequests(params?: ListParams): Promise<PaginatedResponse<AIRequest>> {
    const { data } = await apiClient.get(API.AI.REQUESTS, { params });
    return data;
  },

  async getAIRequest(id: string): Promise<AIRequest> {
    const { data } = await apiClient.get(API.AI.REQUEST_DETAIL(id));
    return data;
  },

  async generateStudyPlan(
    studentIdOrPayload: string | { studentId?: string; subjects: string[]; duration?: number; weeks?: number },
    subjects?: string[],
    weeks?: number
  ): Promise<AIRequest> {
    const payload =
      typeof studentIdOrPayload === 'string'
        ? { student: studentIdOrPayload, subjects, weeks }
        : {
            student: studentIdOrPayload.studentId,
            subjects: studentIdOrPayload.subjects,
            weeks: studentIdOrPayload.weeks ?? studentIdOrPayload.duration,
          };
    const { data } = await apiClient.post(API.AI.STUDY_PLAN, {
      ...payload,
    });
    return data;
  },

  async analyzeGrades(
    studentIdOrPayload: string | { studentId?: string; sequenceId?: string },
    sequenceId?: string
  ): Promise<AIRequest> {
    const payload =
      typeof studentIdOrPayload === 'string'
        ? { student: studentIdOrPayload, sequence: sequenceId }
        : { student: studentIdOrPayload.studentId, sequence: studentIdOrPayload.sequenceId };
    const { data } = await apiClient.post(API.AI.ANALYZE_GRADES, {
      ...payload,
    });
    return data;
  },

  async getAttendanceInsight(studentId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.ATTENDANCE_INSIGHT, {
      student: studentId,
    });
    return data;
  },

  async getExamPrep(studentId: string, subjectId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.EXAM_PREP, {
      student: studentId,
      subject: subjectId,
    });
    return data;
  },

  async generateAttendanceInsight(payload: {
    studentId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AIRequest> {
    return this.getAttendanceInsight(payload.studentId);
  },

  async generateExamPrepPlan(payload: {
    studentId?: string;
    subjectId?: string;
    subject_id?: string;
    examType?: string;
    daysLeft?: number;
  }): Promise<AIRequest> {
    return this.getExamPrep(
      payload.studentId ?? "",
      payload.subjectId ?? payload.subject_id ?? payload.examType ?? ""
    );
  },

  async generateParentReport(payload: {
    studentId?: string;
    student_id?: string;
    period?: string;
  }): Promise<AIRequest> {
    return this.getParentReport(payload.studentId ?? payload.student_id ?? '');
  },

  async getParentReport(studentId: string): Promise<AIRequest> {
    const { data } = await apiClient.post(API.AI.PARENT_REPORT, {
      student: studentId,
    });
    return data;
  },

  async getPlatformInsights(): Promise<AIRequest> {
    const { data } = await apiClient.get(API.AI.PLATFORM_INSIGHTS);
    return data;
  },

  async getInsights(params?: ListParams): Promise<PaginatedResponse<AIInsight>> {
    const { data } = await apiClient.get(API.AI.INSIGHTS, { params });
    return data;
  },

  async getAIInsights(params?: ListParams): Promise<PaginatedResponse<AIInsight>> {
    return this.getInsights(params);
  },

  async getInsight(id: string): Promise<AIInsight> {
    const { data } = await apiClient.get(API.AI.INSIGHT_DETAIL(id));
    return data;
  },

  async generateInsights(_payload?: any): Promise<AIInsight> {
    const { data } = await apiClient.post(API.AI.GENERATE_INSIGHTS, {});
    return data;
  },

  async directChat(message: string, history?: { role: string; content: string }[]): Promise<{ reply: string; tokens_used: number; processing_time_ms: number }> {
    const { data } = await apiClient.post(API.AI.DIRECT_CHAT, { message, history });
    return data;
  },
};
