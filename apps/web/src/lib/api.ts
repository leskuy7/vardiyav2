import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './token-store';

const envApiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const API_URL = envApiUrl.endsWith('/') ? envApiUrl : `${envApiUrl}/`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

let refreshPromise: Promise<string> | null = null;

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Normalize URL by removing leading slash to prevent Axios from overriding baseURL paths
  if (config.url && config.url.startsWith('/')) {
    config.url = config.url.substring(1);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    // Only try refresh if we had sent a token (expired). No token → avoid extra 401 from refresh.
    const hadToken = !!originalRequest.headers?.Authorization;
    if (!hadToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post('/auth/refresh')
        .then((res: { data: { accessToken: string } }) => {
          const token = res.data.accessToken as string;
          setAccessToken(token);
          return token;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const token = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  }
);
