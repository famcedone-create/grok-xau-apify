import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FlowChart, TpBoard } from "@/components/desk/chart";
import { PostFeed } from "@/components/desk/feed";
import { LiveUnavailableBanner } from "@/components/desk/live-banner";
import { BiasMeter, StatsGrid, TotalsRow } from "@/components/desk/stats";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDeskState, MIN_INTERVAL_MS, runScan } from "@/lib/xau/scan";
import { LIVE_UNAVAILABLE } from "@/lib/xau/types";
import {
  formatUsd,
  historyFromPosts,
  sourceLabel,
  WINDOW_OPTIONS,
  windowedSnapshot,
} from "@/lib/xau/view";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const queryClient = useQueryClient();
  const [windowMin, setWindowMin] = useState<(typeof WINDOW_OPTIONS)[number]>(15);
  const [now, setNow] = useState(() => Date.now());

  const deskQuery = useQuery({
    queryKey: ["desk"],
    queryFn: () => getDeskState(),
    refetchInterval: 30_000,
  });

  const scanMut = useMutation({
    mutationFn: (force: boolean) => runScan({ data: { force } }),
    onSuccess: (state) => {
      queryClient.setQueryData(["desk"], state);
    },
  });

  const state = deskQuery.data;
  const liveOk = state?.liveStatus === "live";
  const unavailable = state?.liveStatus === "unavailable" && !scanMut.isPending;
  const snapshot = useMemo(
    () => windowedSnapshot(state?.snapshot ?? null, windowMin),
    [state?.snapshot, windowMin],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state || scanMut.isPending) return;
    const due = Date.parse(state.nextScanAt);
    if (Number.isFinite(due) && due <= Date.now()) {
      scanMut.mutate(false);
    }
    // scanMut is a stable mutate+pending pair; now ticks the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.nextScanAt, scanMut.isPending, now]);

  const remainingMs = Math.max(
    0,
    (state ? Date.parse(state.nextScanAt) : now + MIN_INTERVAL_MS) - now,
  );
  const scanning = scanMut.isPending || deskQuery.isLoading;
  const gold = state?.gold?.price ?? snapshot?.goldPrice ?? null;
  const visibleSnapshot = liveOk ? snapshot : null;

  return (
    <main className="min-h-dvh bg-bg px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Desk XAUUSD
            </p>
            <h1 className="mt-1 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
              XAU Pulse
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Ogni 5 minuti conta su X chi ha postato entrate buy/sell, uscite e possibili
              TP su Gold e XAUUSD. Solo dati live, mai demo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-bg-elevated px-4 py-3 shadow-[var(--shadow-border)]">
              <p className="text-[11px] uppercase tracking-wider text-muted">XAU/USD</p>
              <p className="font-mono text-2xl tabular-nums leading-tight text-fg">
                {gold != null ? formatUsd(gold) : "—"}
              </p>
            </div>
            <Countdown remainingMs={remainingMs} scanning={scanning} />
            <Button
              variant="outline"
              onClick={() => scanMut.mutate(true)}
              disabled={scanning}
              aria-label="Aggiorna ora"
            >
              <RefreshCw className={cn("size-4", scanning && "animate-spin")} />
              Aggiorna
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <WindowPills value={windowMin} onChange={setWindowMin} />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5" />
              {scanning
                ? "Scansione live"
                : unavailable
                  ? LIVE_UNAVAILABLE
                  : liveOk
                    ? sourceLabel(visibleSnapshot?.source, true)
                    : "In attesa"}
            </span>
            {liveOk && visibleSnapshot ? (
              <span className="tabular-nums">
                Ultima scansione{" "}
                {new Date(visibleSnapshot.scannedAt).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>
        </div>

        {deskQuery.isError ? (
          <p className="rounded-lg bg-sell-dim px-4 py-3 text-sm text-sell">
            Impossibile caricare il flusso. Riprova tra poco.
          </p>
        ) : null}
        {unavailable ? <LiveUnavailableBanner /> : null}

        <StatsGrid snapshot={visibleSnapshot} />
        <TotalsRow snapshot={visibleSnapshot} />
        <BiasMeter snapshot={visibleSnapshot} />

        {visibleSnapshot?.summary ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted">{visibleSnapshot.summary}</p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="flex flex-col gap-4 lg:col-span-3">
            <FlowChart
              history={
                liveOk
                  ? (state?.history?.length ?? 0) >= 2
                    ? (state?.history ?? [])
                    : historyFromPosts(visibleSnapshot)
                  : []
              }
            />
            <TpBoard tps={visibleSnapshot?.tps ?? []} />
          </div>
          <div className="lg:col-span-2">
            <PostFeed posts={visibleSnapshot?.posts ?? []} unavailable={unavailable} />
          </div>
        </div>

        <p className="pt-2 text-xs text-subtle">
          Non è consulenza finanziaria. I conteggi derivano solo da post pubblici live su X
          relativi a XAUUSD/Gold, via ricerca X live.
        </p>
      </div>
    </main>
  );
}

function WindowPills({
  value,
  onChange,
}: {
  value: (typeof WINDOW_OPTIONS)[number];
  onChange: (v: (typeof WINDOW_OPTIONS)[number]) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-bg-elevated p-1 shadow-[var(--shadow-border)]">
      {WINDOW_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "h-10 min-w-14 rounded-md px-3 text-sm tabular-nums transition-colors duration-150",
            value === opt ? "bg-bg-subtle text-fg" : "text-muted hover:text-fg",
          )}
        >
          {opt}m
        </button>
      ))}
    </div>
  );
}

function Countdown({ remainingMs, scanning }: { remainingMs: number; scanning: boolean }) {
  const total = MIN_INTERVAL_MS;
  const pct = scanning ? 100 : Math.max(0, Math.min(100, ((total - remainingMs) / total) * 100));
  const mm = Math.floor(remainingMs / 60_000);
  const ss = Math.floor((remainingMs % 60_000) / 1000);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-elevated px-4 py-3 shadow-[var(--shadow-border)]">
      <div
        className="relative size-9"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Tempo alla prossima scansione"
      >
        <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            className="text-bg-subtle"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="3"
            strokeDasharray={`${pct * 0.94} 94`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted">
          {scanning ? "Scansione" : "Prossima"}
        </p>
        <p className="font-mono text-lg tabular-nums leading-tight text-fg">
          {scanning ? "…" : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
        </p>
      </div>
    </div>
  );
}
