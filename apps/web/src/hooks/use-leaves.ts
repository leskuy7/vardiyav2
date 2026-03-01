import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const LONG_STALE_TIME = 5 * 60 * 1000;

export type LeaveRequest = {
    id: string;
    employeeId: string;
    leaveCode: string;
    unit: "DAY" | "HALF_DAY" | "HOUR";
    type?: string; // legacy support
    startDate: string;
    endDate: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    reason?: string | null;
    managerNote?: string | null;
    createdAt: string;
    employee?: {
        id: string;
        department?: string | null;
        user: { name: string; email: string };
    };
};

export type LeaveType = {
    id: string;
    code: string;
    name: string;
    isPaid: boolean;
    annualEntitlementDays?: number | null;
    requiresDocument: boolean;
};

export type LeaveBalance = {
    id: string;
    employeeId: string;
    leaveCode: string;
    periodYear: number;
    accruedMinutes: number;
    usedMinutes: number;
    carryMinutes: number;
    adjustedMinutes: number;
    employee?: {
        id: string;
        user: { name: string; email: string };
    };
    leaveType?: LeaveType;
};

export function useLeaves() {
    const queryClient = useQueryClient();

    const leavesQuery = useQuery({
        queryKey: ["leaves"],
        staleTime: 60 * 1000,
        queryFn: async () => {
            const { data } = await api.get<LeaveRequest[]>("/leave-requests");
            return data;
        },
    });

    const createLeave = useMutation({
        mutationFn: async (payload: { leaveCode: string; unit: string; startDate: string; endDate: string; startTime?: string; endTime?: string; reason?: string }) => {
            const { data } = await api.post<LeaveRequest>("/leave-requests", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status, managerNote }: { id: string; status: string; managerNote?: string }) => {
            const { data } = await api.patch<LeaveRequest>(`/leave-requests/${id}/status`, { status, managerNote });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
        },
    });

    const deleteLeave = useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.delete(`/leave-requests/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leaves"] });
        },
    });

    const typesQuery = useQuery({
        queryKey: ["leave-types"],
        staleTime: LONG_STALE_TIME,
        queryFn: async () => {
            const { data } = await api.get<LeaveType[]>("/leave-types");
            return data;
        }
    });

    const balancesQuery = (employeeId?: string, year?: number) => useQuery({
        queryKey: ["leave-balances", employeeId, year],
        staleTime: 60 * 1000,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (employeeId) params.append('employeeId', employeeId);
            if (year) params.append('year', year.toString());
            const { data } = await api.get<LeaveBalance[]>(`/leave-balances?${params.toString()}`);
            return data;
        }
    });

    const adjustBalance = useMutation({
        mutationFn: async (payload: { employeeId: string; leaveCode: string; year: number; deltaMinutes: number; reason: string }) => {
            const { data } = await api.post<LeaveBalance>("/leave-balances/adjust", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
        }
    });

    return {
        leavesQuery,
        createLeave,
        updateStatus,
        deleteLeave,
        typesQuery,
        balancesQuery,
        adjustBalance
    };
}
