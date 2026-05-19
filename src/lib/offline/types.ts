import {
  AttendanceSession,
  CreateAnnouncementRequest,
  CreateAssignmentRequest,
  CreateAssignmentSubmissionRequest,
  CreateBookRequestTicket,
  CreateExamRequest,
  CreateExamSubmissionRequest,
  CreateFeedbackRequest,
  CreateGradeRequest,
  CreateLiveClassRequest,
  CreateSchoolFeeAssignmentRequest,
  CreateStudentRequest,
  GradeAssignmentSubmissionRequest,
  SendMessageRequest,
  UpdateStudentSchoolFeeRecordRequest,
} from "@/lib/api/types";

export type SyncActionType =
  | "CREATE_STUDENT"
  | "CREATE_ANNOUNCEMENT"
  | "CREATE_FEEDBACK"
  | "CREATE_SCHOOL_FEE_ASSIGNMENT"
  | "UPDATE_STUDENT_SCHOOL_FEE_RECORD"
  | "SEND_MESSAGE"
  | "BULK_RECORD_ATTENDANCE"
  | "CREATE_LIBRARY_REQUEST"
  | "CREATE_SUB_SCHOOL"
  | "ASSIGN_SUB_ADMIN"
  | "CREATE_HIERARCHY_CLASS"
  | "CREATE_HIERARCHY_SUBJECT"
  | "CREATE_ASSIGNMENT"
  | "SUBMIT_ASSIGNMENT"
  | "GRADE_ASSIGNMENT_SUBMISSION"
  | "CREATE_EXAM"
  | "SUBMIT_EXAM"
  | "CREATE_LIVE_CLASS"
  | "CREATE_GRADE";

export type SyncActionPayloadMap = {
  CREATE_STUDENT: CreateStudentRequest;
  CREATE_ANNOUNCEMENT: CreateAnnouncementRequest;
  CREATE_FEEDBACK: CreateFeedbackRequest;
  CREATE_SCHOOL_FEE_ASSIGNMENT: CreateSchoolFeeAssignmentRequest;
  UPDATE_STUDENT_SCHOOL_FEE_RECORD: {
    id: string;
    data: UpdateStudentSchoolFeeRecordRequest;
  };
  SEND_MESSAGE: SendMessageRequest;
  BULK_RECORD_ATTENDANCE: {
    sessionId?: string;
    sessionData?: Partial<AttendanceSession>;
    records: Array<{
      student: string;
      status: "Present" | "Absent" | "Late" | "Excused";
      excuse_note?: string;
    }>;
  };
  CREATE_LIBRARY_REQUEST: CreateBookRequestTicket;
  CREATE_SUB_SCHOOL: {
    name: string;
    vice_principal?: string | null;
    school_id?: string;
  };
  ASSIGN_SUB_ADMIN: {
    staff: string;
    sub_school: string;
    school_id?: string;
  };
  CREATE_HIERARCHY_CLASS: {
    name: string;
    sub_school?: string | null;
    class_master?: string | null;
    school_id?: string;
  };
  CREATE_HIERARCHY_SUBJECT: {
    school_class: string;
    subject?: string | null;
    subject_name?: string;
    subject_code?: string;
    teacher?: string | null;
    type: "mandatory" | "optional";
    coefficient: number;
    school_id?: string;
  };
  CREATE_ASSIGNMENT: CreateAssignmentRequest;
  SUBMIT_ASSIGNMENT: CreateAssignmentSubmissionRequest;
  GRADE_ASSIGNMENT_SUBMISSION: {
    id: string;
    data: GradeAssignmentSubmissionRequest;
  };
  CREATE_EXAM: CreateExamRequest;
  SUBMIT_EXAM: CreateExamSubmissionRequest;
  CREATE_LIVE_CLASS: CreateLiveClassRequest;
  CREATE_GRADE: CreateGradeRequest;
};

type SyncActionBase = {
  id: string;
  createdAt: string;
  description: string;
};

export type SyncAction =
  | (SyncActionBase & {
      type: "CREATE_STUDENT";
      payload: SyncActionPayloadMap["CREATE_STUDENT"];
    })
  | (SyncActionBase & {
      type: "CREATE_ANNOUNCEMENT";
      payload: SyncActionPayloadMap["CREATE_ANNOUNCEMENT"];
    })
  | (SyncActionBase & {
      type: "CREATE_FEEDBACK";
      payload: SyncActionPayloadMap["CREATE_FEEDBACK"];
    })
  | (SyncActionBase & {
      type: "CREATE_SCHOOL_FEE_ASSIGNMENT";
      payload: SyncActionPayloadMap["CREATE_SCHOOL_FEE_ASSIGNMENT"];
    })
  | (SyncActionBase & {
      type: "UPDATE_STUDENT_SCHOOL_FEE_RECORD";
      payload: SyncActionPayloadMap["UPDATE_STUDENT_SCHOOL_FEE_RECORD"];
    })
  | (SyncActionBase & {
      type: "SEND_MESSAGE";
      payload: SyncActionPayloadMap["SEND_MESSAGE"];
    })
  | (SyncActionBase & {
      type: "BULK_RECORD_ATTENDANCE";
      payload: SyncActionPayloadMap["BULK_RECORD_ATTENDANCE"];
    })
  | (SyncActionBase & {
      type: "CREATE_LIBRARY_REQUEST";
      payload: SyncActionPayloadMap["CREATE_LIBRARY_REQUEST"];
    })
  | (SyncActionBase & {
      type: "CREATE_SUB_SCHOOL";
      payload: SyncActionPayloadMap["CREATE_SUB_SCHOOL"];
    })
  | (SyncActionBase & {
      type: "ASSIGN_SUB_ADMIN";
      payload: SyncActionPayloadMap["ASSIGN_SUB_ADMIN"];
    })
  | (SyncActionBase & {
      type: "CREATE_HIERARCHY_CLASS";
      payload: SyncActionPayloadMap["CREATE_HIERARCHY_CLASS"];
    })
  | (SyncActionBase & {
      type: "CREATE_HIERARCHY_SUBJECT";
      payload: SyncActionPayloadMap["CREATE_HIERARCHY_SUBJECT"];
    })
  | (SyncActionBase & {
      type: "CREATE_ASSIGNMENT";
      payload: SyncActionPayloadMap["CREATE_ASSIGNMENT"];
    })
  | (SyncActionBase & {
      type: "SUBMIT_ASSIGNMENT";
      payload: SyncActionPayloadMap["SUBMIT_ASSIGNMENT"];
    })
  | (SyncActionBase & {
      type: "GRADE_ASSIGNMENT_SUBMISSION";
      payload: SyncActionPayloadMap["GRADE_ASSIGNMENT_SUBMISSION"];
    })
  | (SyncActionBase & {
      type: "CREATE_EXAM";
      payload: SyncActionPayloadMap["CREATE_EXAM"];
    })
  | (SyncActionBase & {
      type: "SUBMIT_EXAM";
      payload: SyncActionPayloadMap["SUBMIT_EXAM"];
    })
  | (SyncActionBase & {
      type: "CREATE_LIVE_CLASS";
      payload: SyncActionPayloadMap["CREATE_LIVE_CLASS"];
    })
  | (SyncActionBase & {
      type: "CREATE_GRADE";
      payload: SyncActionPayloadMap["CREATE_GRADE"];
    });
