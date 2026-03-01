import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type OvertimeRecord = {
    id: string;
    employeeId: string;
    weekStart: string;
    strategy: "PLANNED" | "ACTUAL";
    plannedMinutes: number;
    actualMinutes: number;
    regularMinutes: number;
    overtimeMinutes: number;
    overtimeMultiplier: number;
    currency: string;
    estimatedPay?: number | null;
    breakdown?: any;
    employee?: {
        id: string;
        user: { name: string; email: string };
    };
};

export function useWeeklyOvertime(weekStart: string, strategy: "PLANNED" | "ACTUAL" = "PLANNED") {
    return useQuery({
        queryKey: ["overtime", "weekly", weekStart, strategy],
        queryFn: async () => {
            const params = new URLSearchParams({ weekStart, strategy });
            const { data } = await api.get<OvertimeRecord[]>(`/overtime/weekly?${params.toString()}`);
            return data;
        },
        enabled: !!weekStart && !!strategy,
    });
}

export function useOvertime() {
    const queryClient = useQueryClient();

    const weeklyOvertimeQuery = (weekStart: string, strategy: "PLANNED" | "ACTUAL") => useQuery({
        queryKey: ["overtime", "weekly", weekStart, strategy],
        queryFn: async () => {
            const params = new URLSearchParams({ weekStart, strategy });
            const { data } = await api.get<OvertimeRecord[]>(`/overtime/weekly?${params.toString()}`);
            return data;
        },
        enabled: !!weekStart && !!strategy,
    });

    const myOvertimeQuery = (weekStart: string, strategy: "PLANNED" | "ACTUAL") => useQuery({
        queryKey: ["overtime", "my", weekStart, strategy],
        queryFn: async () => {
            const params = new URLSearchParams({ weekStart, strategy });
            const { data } = await api.get<OvertimeRecord[]>(`/overtime/my?${params.toString()}`);
            return data;
        },
        enabled: !!weekStart && !!strategy,
    });

    const recalculateOvertime = useMutation({
        mutationFn: async (payload: { weekStart: string; strategy: "PLANNED" | "ACTUAL" }) => {
            const params = new URLSearchParams({ weekStart: payload.weekStart, strategy: payload.strategy });
            const { data } = await api.post<{ success: boolean; count: number }>(`/overtime/recalculate?${params.toString()}`);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["overtime", "weekly", variables.weekStart, variables.strategy] });
            queryClient.invalidateQueries({ queryKey: ["overtime", "my", variables.weekStart, variables.strategy] });
        }
    });

    return {
        weeklyOvertimeQuery,
        myOvertimeQuery,
        recalculateOvertime,
    };
}
