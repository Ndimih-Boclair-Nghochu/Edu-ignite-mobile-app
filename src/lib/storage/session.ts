import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { User } from "@/lib/api/types";

const STORED_USER_KEY = "eduignite_mobile_user";
const OFFLINE_LOGIN_HASH_KEY = "eduignite_mobile_offline_login_hash";
const OFFLINE_LOGIN_MATRICULE_KEY = "eduignite_mobile_offline_matricule";
const LAST_SYNC_AT_KEY = "eduignite_mobile_last_sync_at";

function normalizeMatricule(matricule: string) {
  return matricule.trim().toUpperCase();
}

async function buildCredentialHash(matricule: string, password: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${normalizeMatricule(matricule)}::${password}`
  );
}

export async function storeUser(user: User) {
  await AsyncStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(STORED_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function storeOfflineCredential(matricule: string, password: string) {
  const [hash] = await Promise.all([buildCredentialHash(matricule, password)]);
  await Promise.all([
    AsyncStorage.setItem(OFFLINE_LOGIN_HASH_KEY, hash),
    AsyncStorage.setItem(OFFLINE_LOGIN_MATRICULE_KEY, normalizeMatricule(matricule)),
  ]);
}

export async function hasOfflineCredential() {
  const stored = await AsyncStorage.getItem(OFFLINE_LOGIN_HASH_KEY);
  return Boolean(stored);
}

export async function validateOfflineCredential(matricule: string, password: string) {
  const [storedHash, storedMatricule, candidateHash] = await Promise.all([
    AsyncStorage.getItem(OFFLINE_LOGIN_HASH_KEY),
    AsyncStorage.getItem(OFFLINE_LOGIN_MATRICULE_KEY),
    buildCredentialHash(matricule, password),
  ]);

  return (
    Boolean(storedHash) &&
    Boolean(storedMatricule) &&
    storedMatricule === normalizeMatricule(matricule) &&
    storedHash === candidateHash
  );
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove([
    STORED_USER_KEY,
    OFFLINE_LOGIN_HASH_KEY,
    OFFLINE_LOGIN_MATRICULE_KEY,
  ]);
}

export async function setLastSyncAt(value: string) {
  await AsyncStorage.setItem(LAST_SYNC_AT_KEY, value);
}

export async function getLastSyncAt() {
  return AsyncStorage.getItem(LAST_SYNC_AT_KEY);
}
