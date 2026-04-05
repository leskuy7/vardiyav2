import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const TIME_ENTRY_STALE_TIME = 30_000;
const ACTIVE_TIME_ENTRY_REFETCH_INTERVAL = 60_000;

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

export type TimeEntryRecord = TimeEntry & {
    employee?: {
        id: string;
        department?: string | null;
        position?: string | null;
        user: {
            id: string;
            name: string;
            email: string;
        };
    };
    shift?: {
        id: string;
        startTime: string;
        endTime: string;
        status: string;
    } | null;
};

export function useActiveTimeEntry(enabled = true) {
    return useQuery<TimeEntry | null>({
        queryKey: ["time-entries", "active"],
        staleTime: TIME_ENTRY_STALE_TIME,
        queryFn: async () => {
            const { data } = await api.get<TimeEntry | null>("/time-entries/active");
            return data ?? null;
        },
        enabled,
        refetchInterval: ACTIVE_TIME_ENTRY_REFETCH_INTERVAL,
    });
}

export function useTimeEntriesList(
    filters: { weekStart: string; employeeId?: string; status?: "OPEN" | "CLOSED" | "VOID" },
    enabled = true
) {
    const employeeId = filters.employeeId ?? "";
    const status = filters.status ?? "";

    return useQuery<TimeEntryRecord[]>({
        queryKey: ["time-entries", "list", filters.weekStart, employeeId, status],
        enabled,
        staleTime: TIME_ENTRY_STALE_TIME,
        placeholderData: (previousData) => previousData,
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set("weekStart", filters.weekStart);
            if (employeeId) params.set("employeeId", employeeId);
            if (status) params.set("status", status);

            const { data } = await api.get<TimeEntryRecord[]>(`/time-entries?${params.toString()}`);
            return Array.isArray(data) ? data : [];
        },
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
