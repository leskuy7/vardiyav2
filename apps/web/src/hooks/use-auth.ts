"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getAccessToken } from "../lib/token-store";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  employee?: { id: string } | null;
};

export function useAuth() {
  const hasToken = typeof window !== "undefined" && !!getAccessToken();
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await api.get<AuthUser>("/auth/me");
      return response.data;
    },
    retry: false,
    refetchOnWindowFocus: true,
    enabled: hasToken,
  });
}
