import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type LeaveRequest = {
    id: string;
    employeeId: string;
    type: "ANNUAL" | "SICK" | "UNPAID" | "OTHER";
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

export function useLeaves() {
    const queryClient = useQueryClient();

    const leavesQuery = useQuery({
        queryKey: ["leaves"],
        queryFn: async () => {
            const { data } = await api.get<LeaveRequest[]>("/leave-requests");
            return data;
        },
    });

    const createLeave = useMutation({
        mutationFn: async (payload: { type: string; startDate: string; endDate: string; reason?: string }) => {
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

    return {
        leavesQuery,
        createLeave,
        updateStatus,
        deleteLeave,
    };
}
