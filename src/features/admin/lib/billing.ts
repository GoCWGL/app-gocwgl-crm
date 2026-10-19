import type { PaymentProvider } from "@/data/admin";
import type { PaymentConnectionOut } from "@/utils/api/models";

/** The custom provider shows the name the user typed. */
export const providerName = (p: PaymentProvider, connections: PaymentConnectionOut[] | undefined) => {
  const conn = connections?.find((c) => c.provider === p.id);
  return p.id === "custom" && conn?.label ? conn.label : p.name;
};

export const connectionOf = (connections: PaymentConnectionOut[] | undefined, provider: string) =>
  connections?.find((c) => c.provider === provider && c.connected !== false);
