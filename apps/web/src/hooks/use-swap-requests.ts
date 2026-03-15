"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { showMutationError } from "../lib/mutation-error";

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
        onError: (error) => showMutationError(error, 'Takas talebi oluşturulamadı.'),
    });

    const approveSwapRequest = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/swap-requests/${id}/approve`);
            return response.data;
        },
        onSuccess: invalidate,
        onError: (error) => showMutationError(error, 'Takas talebi onaylanamadı.'),
    });

    const rejectSwapRequest = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/swap-requests/${id}/reject`);
            return response.data;
        },
        onSuccess: invalidate,
        onError: (error) => showMutationError(error, 'Takas talebi reddedilemedi.'),
    });

    return {
        createSwapRequest,
        approveSwapRequest,
        rejectSwapRequest,
    };
}
