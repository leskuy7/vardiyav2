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
    employee?: {
        id: string;
        user: { name: string };
    };
    shift?: any; // To be refined if needed
};

export function useTimeEntries() {
    const queryClient = useQueryClient();

    const timeEntriesQuery = (employeeId?: string, startDate?: string, endDate?: string) => useQuery({
        queryKey: ["time-entries", employeeId, startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (employeeId) params.append('employeeId', employeeId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            // Assuming a GET endpoint exists or will exist. The user only specified POST in API so far, but we'll add this for future-proofing or if it gets added.
            const { data } = await api.get<TimeEntry[]>(`/time-entries?${params.toString()}`);
            return data;
        },
        enabled: false, // Wait until we actually have the endpoint
    });

    const checkIn = useMutation({
        mutationFn: async (payload: { shiftId?: string; checkInAt?: string; source?: string; employeeId?: string; note?: string }) => {
            const { data } = await api.post<TimeEntry>("/time-entries/check-in", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        }
    });

    const checkOut = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { checkOutAt?: string; note?: string } }) => {
            const { data } = await api.post<TimeEntry>(`/time-entries/${id}/check-out`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        }
    });

    return {
        timeEntriesQuery,
        checkIn,
        checkOut,
    };
}
