import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { announcementsService } from "@/lib/api/services/announcements.service";
import { assignmentsService } from "@/lib/api/services/assignments.service";
import { attendanceService } from "@/lib/api/services/attendance.service";
import { chatService } from "@/lib/api/services/chat.service";
import { examsService } from "@/lib/api/services/exams.service";
import { feesService } from "@/lib/api/services/fees.service";
import { gradesService } from "@/lib/api/services/grades.service";
import { libraryService } from "@/lib/api/services/library.service";
import { liveClassesService } from "@/lib/api/services/live-classes.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { studentsService } from "@/lib/api/services/students.service";
import { appendQueueItem, getStoredQueue, removeQueueItem, saveQueue } from "@/lib/offline/queue";
import { SyncAction, SyncActionType, SyncActionPayloadMap } from "@/lib/offline/types";
import { queryKeys } from "@/lib/queryKeys";
import { getLastSyncAt, setLastSyncAt } from "@/lib/storage/session";
import { useAuth } from "@/providers/AuthProvider";

type SyncContextValue = {
  isOnline: boolean;
  queue: SyncAction[];
  isProcessing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  enqueue: <T extends SyncActionType>(
    type: T,
    payload: SyncActionPayloadMap[T],
    description: string
  ) => Promise<SyncAction>;
  flushQueue: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

function createSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<SyncAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const [storedQueue, storedSyncAt] = await Promise.all([getStoredQueue(), getLastSyncAt()]);
      if (!mounted) {
        return;
      }
      setQueue(storedQueue);
      setLastSyncAtState(storedSyncAt);
    }

    bootstrap();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function processAction(action: SyncAction) {
    switch (action.type) {
      case "CREATE_STUDENT":
        await studentsService.createStudent(action.payload);
        queryClient.invalidateQueries({ queryKey: queryKeys.students.summary });
        queryClient.invalidateQueries({ queryKey: ["students"] });
        break;
      case "CREATE_ANNOUNCEMENT":
        await announcementsService.createAnnouncement(action.payload);
        queryClient.invalidateQueries({ queryKey: ["announcements"] });
        break;
      case "CREATE_SCHOOL_FEE_ASSIGNMENT":
        await feesService.createSchoolFeeAssignment(action.payload);
        queryClient.invalidateQueries({ queryKey: ["fees"] });
        break;
      case "UPDATE_STUDENT_SCHOOL_FEE_RECORD":
        await feesService.updateStudentSchoolFeeRecord(action.payload.id, action.payload.data);
        queryClient.invalidateQueries({ queryKey: ["fees"] });
        break;
      case "SEND_MESSAGE":
        await chatService.sendMessage(action.payload);
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
        if (action.payload.conversation_id || action.payload.conversationId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.chat.messages(
              action.payload.conversation_id ?? action.payload.conversationId ?? ""
            ),
          });
        }
        break;
      case "BULK_RECORD_ATTENDANCE":
        if (action.payload.sessionId) {
          await attendanceService.bulkRecordAttendance({
            sessionId: action.payload.sessionId,
            records: action.payload.records,
          });
        } else {
          const session = await attendanceService.createSession(action.payload.sessionData ?? {});
          await attendanceService.bulkRecordAttendance({
            sessionId: session.id,
            records: action.payload.records,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        break;
      case "CREATE_LIBRARY_REQUEST":
        await libraryService.createRequest(action.payload);
        queryClient.invalidateQueries({ queryKey: ["library"] });
        break;
      case "CREATE_SUB_SCHOOL":
        await schoolsService.createSubSchool(action.payload);
        queryClient.invalidateQueries({ queryKey: ["schools", "hierarchy"] });
        break;
      case "ASSIGN_SUB_ADMIN":
        await schoolsService.assignSubAdmin(action.payload);
        queryClient.invalidateQueries({ queryKey: ["schools", "hierarchy"] });
        break;
      case "CREATE_HIERARCHY_CLASS":
        await schoolsService.createHierarchyClass(action.payload);
        queryClient.invalidateQueries({ queryKey: ["schools", "hierarchy"] });
        break;
      case "CREATE_HIERARCHY_SUBJECT":
        await schoolsService.createHierarchySubject(action.payload);
        queryClient.invalidateQueries({ queryKey: ["schools", "hierarchy"] });
        queryClient.invalidateQueries({ queryKey: ["grades", "subjects"] });
        break;
      case "CREATE_ASSIGNMENT":
        await assignmentsService.createAssignment(action.payload);
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        break;
      case "SUBMIT_ASSIGNMENT":
        await assignmentsService.createSubmission(action.payload);
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        break;
      case "GRADE_ASSIGNMENT_SUBMISSION":
        await assignmentsService.gradeSubmission(action.payload.id, action.payload.data);
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        break;
      case "CREATE_EXAM":
        await examsService.createExam(action.payload);
        queryClient.invalidateQueries({ queryKey: ["exams"] });
        break;
      case "SUBMIT_EXAM":
        await examsService.createSubmission(action.payload);
        queryClient.invalidateQueries({ queryKey: ["exams"] });
        break;
      case "CREATE_LIVE_CLASS":
        await liveClassesService.createLiveClass(action.payload);
        queryClient.invalidateQueries({ queryKey: ["live-classes"] });
        queryClient.invalidateQueries({ queryKey: ["schedule"] });
        break;
      case "CREATE_GRADE":
        await gradesService.createGrade(action.payload);
        queryClient.invalidateQueries({ queryKey: ["grades"] });
        break;
      default:
        break;
    }
  }

  const flushQueue = async () => {
    if (!isOnline || isProcessing || !queue.length || !user) {
      return;
    }

    setIsProcessing(true);
    setLastError(null);

    try {
      for (const action of queue) {
        await processAction(action);
        const updatedQueue = await removeQueueItem(action.id);
        setQueue(updatedQueue);
      }

      const syncTime = new Date().toISOString();
      setLastSyncAtState(syncTime);
      await setLastSyncAt(syncTime);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "The queued changes could not sync.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isOnline && queue.length && user) {
      void flushQueue();
    }
  }, [isOnline, queue.length, user]);

  const enqueue: SyncContextValue["enqueue"] = async (type, payload, description) => {
    const action = {
      id: createSyncId(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      description,
    } as SyncAction;

    const nextQueue = await appendQueueItem(action);
    setQueue(nextQueue);
    return action;
  };

  const value = useMemo<SyncContextValue>(
    () => ({
      isOnline,
      queue,
      isProcessing,
      lastSyncAt,
      lastError,
      enqueue,
      flushQueue,
    }),
    [isOnline, isProcessing, lastError, lastSyncAt, queue]
  );

  useEffect(() => {
    void saveQueue(queue);
  }, [queue]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used inside SyncProvider");
  }
  return context;
}
