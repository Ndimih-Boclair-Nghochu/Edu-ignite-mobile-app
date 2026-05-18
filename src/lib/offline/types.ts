import {
  AttendanceSession,
  CreateAnnouncementRequest,
  CreateBookRequestTicket,
  CreateSchoolFeeAssignmentRequest,
  CreateStudentRequest,
  SendMessageRequest,
  UpdateStudentSchoolFeeRecordRequest,
} from "@/lib/api/types";

export type SyncActionType =
  | "CREATE_STUDENT"
  | "CREATE_ANNOUNCEMENT"
  | "CREATE_SCHOOL_FEE_ASSIGNMENT"
  | "UPDATE_STUDENT_SCHOOL_FEE_RECORD"
  | "SEND_MESSAGE"
  | "BULK_RECORD_ATTENDANCE"
  | "CREATE_LIBRARY_REQUEST"
  | "CREATE_SUB_SCHOOL"
  | "ASSIGN_SUB_ADMIN"
  | "CREATE_HIERARCHY_CLASS"
  | "CREATE_HIERARCHY_SUBJECT";

export type SyncActionPayloadMap = {
  CREATE_STUDENT: CreateStudentRequest;
  CREATE_ANNOUNCEMENT: CreateAnnouncementRequest;
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
    });
