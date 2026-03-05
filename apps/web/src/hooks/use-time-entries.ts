import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type TimeEntry = {
    id: string;
    employeeId: string;
    shiftId?: string | null;
    checkInAt: string;
    checkOutAt?: string | null;
    endAt?: string | null;
    status: "OPEN" | "CLOSED" | "VOID";
    source: "MANUAL" | "KIOSK" | "MOBILE" | "IMPORT";
    note?: string | null;
    createdAt: string;
};

export function useActiveTimeEntry(enabled = true) {
    return useQuery<TimeEntry | null>({
        queryKey: ["time-entries", "active"],
        queryFn: async () => {
            const { data } = await api.get<TimeEntry | null>("/time-entries/active");
            return data ?? null;
        },
        enabled,
        refetchInterval: 30000,
    });
}

export function useTimeEntryActions() {
    const queryClient = useQueryClient();

    const checkIn = useMutation({
        mutationFn: async (payload: { shiftId?: string; checkInAt?: string }) => {
            const { data } = await api.post<TimeEntry>("/time-entries/check-in", {
                shiftId: payload.shiftId,
                checkInAt: payload.checkInAt ?? new Date().toISOString(),
                source: "MANUAL",
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        },
    });

    const checkOut = useMutation({
        mutationFn: async (payload: { entryId: string; checkOutAt?: string }) => {
            const { data } = await api.post<TimeEntry>(
                `/time-entries/${payload.entryId}/check-out`,
                {
                    checkOutAt: payload.checkOutAt ?? new Date().toISOString(),
                }
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        },
    });

    return { checkIn, checkOut };
}
