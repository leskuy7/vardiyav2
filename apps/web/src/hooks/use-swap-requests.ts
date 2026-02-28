"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

type CreateSwapPayload = {
    shiftId: string;
    targetEmployeeId?: string;
};

export function useSwapRequests() {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["schedule"] });
        queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
    };

    const createSwapRequest = useMutation({
        mutationFn: async (payload: CreateSwapPayload) => {
            const response = await api.post("/swap-requests", payload);
            return response.data;
        },
        onSuccess: invalidate,
    });

    const approveSwapRequest = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/swap-requests/${id}/approve`);
            return response.data;
        },
        onSuccess: invalidate,
    });

    const rejectSwapRequest = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/swap-requests/${id}/reject`);
            return response.data;
        },
        onSuccess: invalidate,
    });

    return {
        createSwapRequest,
        approveSwapRequest,
        rejectSwapRequest,
    };
}
