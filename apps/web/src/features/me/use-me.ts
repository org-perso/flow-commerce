"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMe, updateMe } from "./me-api";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (me) => queryClient.setQueryData(["me"], me),
  });
}
