"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

type Options<TData, TVars> = {
  /** Query keys (prefixes) to refetch after success, so lists refresh. */
  invalidate?: QueryKey[] | ((data: TData, vars: TVars) => QueryKey[]);
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: unknown, vars: TVars) => void;
};

/** useMutation + invalidate the affected queries after every successful change. */
export function useApiMutation<TData, TVars = void>(fn: (vars: TVars) => Promise<TData>, opts: Options<TData, TVars> = {}) {
  const qc = useQueryClient();
  return useMutation<TData, unknown, TVars>({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      const keys = typeof opts.invalidate === "function" ? opts.invalidate(data, vars) : (opts.invalidate ?? []);
      opts.onSuccess?.(data, vars);
      await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
    onError: (error, vars) => opts.onError?.(error, vars),
  });
}
