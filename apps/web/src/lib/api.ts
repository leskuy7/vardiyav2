import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './token-store';

// Production (Vercel): set NEXT_PUBLIC_API_BASE to Railway API root (e.g. https://xxx.up.railway.app)
// or NEXT_PUBLIC_API_URL to full API path (e.g. https://xxx.up.railway.app/api)
const apiUrlRaw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
const envApiUrl =
  apiUrlRaw ||
  (process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, '')}/api`
    : '/api');
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

function forceLogout() {
  setAccessToken(null);
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

function normalizePath(url?: string) {
  return (url ?? '').replace(/^\//, '');
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestPath = normalizePath(originalRequest?.url);
    const isRefreshCall = requestPath.startsWith('auth/refresh');

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshCall) {
      forceLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post('auth/refresh')
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
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError: any) {
      if (refreshError?.response?.data?.code === 'CSRF_BLOCKED') {
        console.error('CSRF ayari eksik veya gecersiz: CSRF_ORIGINS degerini kontrol edin.');
      }
      forceLogout();
      return Promise.reject(refreshError);
    }
  }
);
