import type { GoldQuote } from "./types";

export async function fetchGoldPrice(): Promise<GoldQuote | null> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { price?: number; updatedAt?: string };
    if (typeof body.price !== "number") return null;
    return {
      price: body.price,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
