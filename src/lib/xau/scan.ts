import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { classifyAll, summarize } from "./classify";
import { collectPosts } from "./fetch-x";
import { fetchGoldPrice } from "./gold-price";
import {
  LIVE_UNAVAILABLE,
  type ClassifiedPost,
  type DeskState,
  type HistoryPoint,
  type LiveStatus,
  type ScanSource,
  type Snapshot,
  type TpLevel,
} from "./types";

export const MIN_INTERVAL_MS = 5 * 60 * 1000;
const FORCE_MIN_MS = 45_000;

const globalRef = globalThis as typeof globalThis & {
  __xauScanPromise__?: Promise<DeskState>;
  __xauLastError__?: string | null;
  __xauLiveStatus__?: LiveStatus;
  __xauLastAttemptAt__?: number;
};

type SnapshotRow = {
  id: number;
  scanned_at: string;
  source: string;
  window_minutes: number;
  buy_count: number;
  sell_count: number;
  exit_count: number;
  tp_count: number;
  total_posts: number;
  gold_price: string | number | null;
  bias: string;
  summary: string | null;
  posts_json: ClassifiedPost[] | string;
  tps_json: TpLevel[] | string;
};

function parseJson<T>(value: T | string, fallback: T): T {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toIso(value: string): string {
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function mapSnapshot(row: SnapshotRow): Snapshot {
  return {
    id: row.id,
    scannedAt: toIso(row.scanned_at),
    source: "apify",
    windowMinutes: row.window_minutes,
    buyCount: row.buy_count,
    sellCount: row.sell_count,
    exitCount: row.exit_count,
    tpCount: row.tp_count,
    totalPosts: row.total_posts,
    goldPrice:
      row.gold_price == null
        ? null
        : typeof row.gold_price === "number"
          ? row.gold_price
          : Number(row.gold_price),
    bias: (row.bias as Snapshot["bias"]) ?? "neutral",
    summary: row.summary ?? "",
    posts: parseJson<ClassifiedPost[]>(row.posts_json, []),
    tps: parseJson<TpLevel[]>(row.tps_json, []),
  };
}

async function latestLiveRow(): Promise<SnapshotRow | null> {
  const sql = await getSql();
  const rows = await sql<SnapshotRow>`
    select * from xau_snapshots
    where source = 'apify'
    order by scanned_at desc
    limit 1
  `;
  return rows[0] ?? null;
}

async function historyRows(): Promise<HistoryPoint[]> {
  const sql = await getSql();
  const rows = await sql<SnapshotRow>`
    select scanned_at, buy_count, sell_count, exit_count, tp_count, total_posts, gold_price
    from xau_snapshots
    where source = 'apify'
    order by scanned_at desc
    limit 36
  `;
  return rows
    .map((r) => ({
      scannedAt: toIso(r.scanned_at),
      buyCount: r.buy_count,
      sellCount: r.sell_count,
      exitCount: r.exit_count,
      tpCount: r.tp_count,
      totalPosts: r.total_posts,
      goldPrice:
        r.gold_price == null
          ? null
          : typeof r.gold_price === "number"
            ? r.gold_price
            : Number(r.gold_price),
    }))
    .reverse();
}

async function insertSnapshot(input: {
  source: ScanSource;
  windowMinutes: number;
  goldPrice: number | null;
  posts: ClassifiedPost[];
}): Promise<Snapshot> {
  const stats = summarize(input.posts);
  const sql = await getSql();
  const rows = await sql<SnapshotRow>`
    insert into xau_snapshots (
      source, window_minutes, buy_count, sell_count, exit_count, tp_count,
      total_posts, gold_price, bias, summary, posts_json, tps_json
    ) values (
      ${input.source},
      ${input.windowMinutes},
      ${stats.buyCount},
      ${stats.sellCount},
      ${stats.exitCount},
      ${stats.tpCount},
      ${stats.totalPosts},
      ${input.goldPrice},
      ${stats.bias},
      ${stats.summary},
      ${JSON.stringify(input.posts.slice(0, 80))},
      ${JSON.stringify(stats.tps)}
    )
    returning *
  `;
  await sql`
    delete from xau_snapshots
    where id not in (
      select id from (
        select id from xau_snapshots
        where source = 'apify'
        order by scanned_at desc
        limit 36
      ) as keepers
    )
  `;
  return mapSnapshot(rows[0]);
}

function computeNextScanAt(snapshot: Snapshot | null, liveStatus: LiveStatus): string {
  const now = Date.now();
  if (liveStatus === "pending") return new Date(now).toISOString();
  if (liveStatus === "unavailable") {
    const attempt = globalRef.__xauLastAttemptAt__ ?? now;
    return new Date(Math.max(attempt + MIN_INTERVAL_MS, now)).toISOString();
  }
  const scanned = snapshot ? Date.parse(snapshot.scannedAt) : 0;
  const next = scanned > 0 ? scanned + MIN_INTERVAL_MS : now;
  return new Date(Math.max(next, now)).toISOString();
}

async function buildState(
  snapshot: Snapshot | null,
  lastError: string | null,
  liveStatus: LiveStatus,
): Promise<DeskState> {
  const gold =
    snapshot?.goldPrice != null
      ? { price: snapshot.goldPrice, updatedAt: snapshot.scannedAt }
      : await fetchGoldPrice();
  return {
    snapshot,
    history: await historyRows(),
    gold: gold
      ? gold
      : snapshot?.goldPrice != null
        ? { price: snapshot.goldPrice, updatedAt: snapshot.scannedAt }
        : null,
    nextScanAt: computeNextScanAt(snapshot, liveStatus),
    minIntervalMs: MIN_INTERVAL_MS,
    lastError,
    liveStatus,
  };
}

async function performScan(force: boolean): Promise<DeskState> {
  const latest = await latestLiveRow();
  const status = globalRef.__xauLiveStatus__;
  const minWait = force ? FORCE_MIN_MS : MIN_INTERVAL_MS;

  if (latest && status !== "unavailable") {
    const age = Date.now() - Date.parse(toIso(latest.scanned_at));
    if (age < minWait) {
      return buildState(mapSnapshot(latest), null, "live");
    }
  }

  if (status === "unavailable") {
    const since = Date.now() - (globalRef.__xauLastAttemptAt__ ?? 0);
    if (since < minWait) {
      return buildState(
        latest ? mapSnapshot(latest) : null,
        LIVE_UNAVAILABLE,
        "unavailable",
      );
    }
  }

  const [collected, gold] = await Promise.all([collectPosts(), fetchGoldPrice()]);
  globalRef.__xauLastAttemptAt__ = Date.now();

  if (!collected.live) {
    globalRef.__xauLastError__ = LIVE_UNAVAILABLE;
    globalRef.__xauLiveStatus__ = "unavailable";
    return buildState(latest ? mapSnapshot(latest) : null, LIVE_UNAVAILABLE, "unavailable");
  }

  const classified = classifyAll(collected.posts);
  const snapshot = await insertSnapshot({
    source: "apify",
    windowMinutes: 60,
    goldPrice: gold?.price ?? null,
    posts: classified,
  });
  globalRef.__xauLastError__ = null;
  globalRef.__xauLiveStatus__ = "live";
  return buildState(snapshot, null, "live");
}

export const getDeskState = createServerFn({ method: "GET" }).handler(
  async (): Promise<DeskState> => {
    const snapshotRow = await latestLiveRow();
    const snapshot = snapshotRow ? mapSnapshot(snapshotRow) : null;
    const liveStatus: LiveStatus =
      globalRef.__xauLiveStatus__ ?? (snapshot ? "live" : "pending");
    const lastError =
      liveStatus === "unavailable" ? (globalRef.__xauLastError__ ?? LIVE_UNAVAILABLE) : null;
    return buildState(snapshot, lastError, liveStatus);
  },
);

export const runScan = createServerFn({ method: "POST" })
  .validator((input: { force?: boolean }) => ({ force: Boolean(input?.force) }))
  .handler(async ({ data }): Promise<DeskState> => {
    if (globalRef.__xauScanPromise__) return globalRef.__xauScanPromise__;
    const pending = performScan(data.force).finally(() => {
      globalRef.__xauScanPromise__ = undefined;
    });
    globalRef.__xauScanPromise__ = pending;
    return pending;
  });
