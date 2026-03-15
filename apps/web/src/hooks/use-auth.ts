"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../lib/api";
import { getAccessToken, setAccessToken } from "../lib/token-store";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  employee?: {
    id: string;
    position?: string | null;
    department?: string | null;
    phone?: string | null;
    hourlyRate?: string | number | null;
    maxWeeklyHours?: number | null;
    hireDate?: string | null;
    isActive?: boolean;
  } | null;
};

type UseAuthOptions = {
  initialData?: AuthUser | null;
};

export function useAuth(options?: UseAuthOptions) {
  return useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    initialData: options?.initialData,
    queryFn: async () => {
      try {
        if (!getAccessToken()) {
          const refreshResponse = await api.post<{ accessToken: string }>("/auth/refresh");
          setAccessToken(refreshResponse.data.accessToken);
        }
        const response = await api.get<AuthUser>("/auth/me");
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setAccessToken(null);
          return null;
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
    enabled: typeof window !== "undefined",
  });
}
