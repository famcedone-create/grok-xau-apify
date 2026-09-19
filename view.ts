import { filterByWindow, summarize } from "./classify";
import { LIVE_UNAVAILABLE, type HistoryPoint, type Snapshot } from "./types";

export const WINDOW_OPTIONS = [5, 15, 30, 60] as const;
export type WindowMinutes = (typeof WINDOW_OPTIONS)[number];

export function windowedSnapshot(
  snapshot: Snapshot | null,
  windowMinutes: number,
): Snapshot | null {
  if (!snapshot) return null;
  const posts = filterByWindow(
    snapshot.posts,
    windowMinutes,
    Date.parse(snapshot.scannedAt) || Date.now(),
  );
  const stats = summarize(posts);
  return {
    ...snapshot,
    windowMinutes,
    posts,
    ...stats,
  };
}

export function formatUsd(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function sourceLabel(source: Snapshot["source"] | undefined, live: boolean): string {
  if (!live) return LIVE_UNAVAILABLE;
  if (source === "apify") return "Ricerca X live · Apify";
  return LIVE_UNAVAILABLE;
}

export function historyFromPosts(snapshot: Snapshot | null): HistoryPoint[] {
  if (!snapshot || snapshot.posts.length === 0) return [];
  const bucketMs = 5 * 60_000;
  const map = new Map<number, HistoryPoint>();
  for (const post of snapshot.posts) {
    const t = Date.parse(post.postedAt);
    if (!Number.isFinite(t)) continue;
    const key = Math.floor(t / bucketMs) * bucketMs;
    const cur = map.get(key) ?? {
      scannedAt: new Date(key).toISOString(),
      buyCount: 0,
      sellCount: 0,
      exitCount: 0,
      tpCount: 0,
      totalPosts: 0,
      goldPrice: snapshot.goldPrice,
    };
    cur.totalPosts += 1;
    if (post.isBuy) cur.buyCount += 1;
    if (post.isSell) cur.sellCount += 1;
    if (post.isExit) cur.exitCount += 1;
    if (post.hasTp) cur.tpCount += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}
