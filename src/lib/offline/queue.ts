import AsyncStorage from "@react-native-async-storage/async-storage";
import { SyncAction } from "@/lib/offline/types";

const QUEUE_KEY = "eduignite_mobile_sync_queue";

export async function getStoredQueue(): Promise<SyncAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveQueue(queue: SyncAction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function appendQueueItem(action: SyncAction) {
  const queue = await getStoredQueue();
  const nextQueue = [...queue, action];
  await saveQueue(nextQueue);
  return nextQueue;
}

export async function removeQueueItem(actionId: string) {
  const queue = await getStoredQueue();
  const nextQueue = queue.filter((item) => item.id !== actionId);
  await saveQueue(nextQueue);
  return nextQueue;
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
