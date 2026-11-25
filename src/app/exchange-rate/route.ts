import { connection } from "next/server";

type Rate = { rate: number; date: string };

// Kept for an hour per server; after that, the last known rate still answers if the provider is down.
const FRESH_MS = 3_600_000;
let saved: (Rate & { at: number }) | null = null;

/** Today's US dollar to Philippine peso reference rate (European Central Bank, by Frankfurter). Public, sends nothing about the user. */
export async function GET() {
  await connection();
  if (!saved || Date.now() - saved.at > FRESH_MS) {
    try {
      const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=PHP", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      const body = (await res.json()) as { date?: string; rates?: { PHP?: number } };
      const rate = body.rates?.PHP;
      if (!res.ok || typeof rate !== "number" || !(rate > 0) || !body.date) throw new Error("No rate");
      saved = { rate, date: body.date, at: Date.now() };
    } catch {
      if (!saved) return Response.json({ error: "The exchange rate is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  return Response.json({ rate: saved.rate, date: saved.date } satisfies Rate, { headers: { "Cache-Control": "private, max-age=600" } });
}
