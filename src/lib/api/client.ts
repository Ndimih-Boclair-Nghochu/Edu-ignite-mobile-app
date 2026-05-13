import * as SecureStore from "expo-secure-store";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "http://localhost:8000/api/v1";

const ACCESS_KEY = "eduignite_mobile_access_token";
const REFRESH_KEY = "eduignite_mobile_refresh_token";

type TokenState = {
  access: string | null;
  refresh: string | null;
  hydrated: boolean;
};

const tokenState: TokenState = {
  access: null,
  refresh: null,
  hydrated: false,
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export async function hydrateTokens() {
  if (tokenState.hydrated) {
    return tokenState;
  }

  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);

  tokenState.access = access;
  tokenState.refresh = refresh;
  tokenState.hydrated = true;
  return tokenState;
}

export function getAccessToken() {
  return tokenState.access;
}

export function getRefreshToken() {
  return tokenState.refresh;
}

export async function setTokens(access: string, refresh: string) {
  tokenState.access = access;
  tokenState.refresh = refresh;
  tokenState.hydrated = true;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function clearTokens() {
  tokenState.access = null;
  tokenState.refresh = null;
  tokenState.hydrated = true;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await hydrateTokens();
  const token = tokenState.access;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (error: AxiosError | Error) => void }> = [];

const processQueue = (error: AxiosError | Error | null, token: string | null = null) => {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
      return;
    }
    entry.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    await hydrateTokens();

    const refresh = tokenState.refresh;
    const access = tokenState.access;
    const isAuthEndpoint = Boolean(originalRequest?.url?.includes("/auth/"));

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (!refresh || !access || isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => resolve(token),
            reject,
          });
        }).then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        const newAccess = data.access ?? data.access_token ?? "";
        await setTokens(newAccess, refresh);
        processQueue(null, newAccess);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        await clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
