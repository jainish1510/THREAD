"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type User } from "@/lib/api";

/** Current session user, or null when signed out / API unreachable. */
export function useAuth() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<User>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 0)) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
  return {
    user: query.data ?? null,
    loading: query.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
    signOut: async () => {
      await api("/auth/logout", { method: "POST" }).catch(() => undefined);
      qc.setQueryData(["me"], null);
      qc.removeQueries({ queryKey: ["account"] });
    },
  };
}
