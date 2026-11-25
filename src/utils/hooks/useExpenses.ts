"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/expenses";
import { isStaffAdmin } from "@/utils/auth/session";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";
import { useCanUseMenu, useMe } from "./useUsers";

/** Owners and admins with the Billing menu; fetched again when opened or focused, as repeating ones add themselves. */
export const useExpenses = () => {
  const menu = useCanUseMenu("payments");
  const admin = isStaffAdmin(useMe().data);
  return useQuery({
    queryKey: qk.expenses,
    queryFn: api.listExpenses,
    enabled: menu && admin,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 60_000,
  });
};

// The billing overview and every shareholder figure count expenses too.
const opts = { invalidate: [qk.expenses, qk.shareholders] };
export const useSaveExpense = () => useApiMutation(api.saveExpense, opts);
export const useSetExpenseReceipt = () => useApiMutation(api.setExpenseReceipt, opts);
export const useDeleteExpense = () => useApiMutation(api.deleteExpense, opts);
export const useOpenExpenseReceipt = () => useApiMutation(api.openExpenseReceipt);
export const useSaveRecurringExpense = () => useApiMutation(api.saveRecurringExpense, opts);
export const useDeleteRecurringExpense = () => useApiMutation(api.deleteRecurringExpense, opts);
