import { ArrowDownRight, ArrowUpRight, LogOut, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snapshot } from "@/lib/xau/types";

const CARDS = [
  {
    key: "buy" as const,
    label: "Entrate BUY",
    hint: "long / buy",
    icon: ArrowUpRight,
    value: (s: Snapshot) => s.buyCount,
    color: "text-buy",
    bg: "bg-buy-dim",
  },
  {
    key: "sell" as const,
    label: "Entrate SELL",
    hint: "short / sell",
    icon: ArrowDownRight,
    value: (s: Snapshot) => s.sellCount,
    color: "text-sell",
    bg: "bg-sell-dim",
  },
  {
    key: "exit" as const,
    label: "Uscite",
    hint: "close / TP hit",
    icon: LogOut,
    value: (s: Snapshot) => s.exitCount,
    color: "text-exit",
    bg: "bg-exit-dim",
  },
  {
    key: "tp" as const,
    label: "Con TP",
    hint: "target citati",
    icon: Target,
    value: (s: Snapshot) => s.tpCount,
    color: "text-tp",
    bg: "bg-tp-dim",
  },
];

export function StatsGrid({ snapshot }: { snapshot: Snapshot | null }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const n = snapshot ? card.value(snapshot) : null;
        return (
          <article
            key={card.key}
            className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {card.label}
              </p>
              <span className={cn("flex size-8 items-center justify-center rounded-sm", card.bg)}>
                <Icon className={cn("size-4", card.color)} strokeWidth={1.75} />
              </span>
            </div>
            <p className={cn("mt-3 font-mono text-3xl font-medium tabular-nums leading-none", card.color)}>
              {n == null ? "—" : n}
            </p>
            <p className="mt-2 text-xs text-subtle">{card.hint}</p>
          </article>
        );
      })}
    </section>
  );
}

export function BiasMeter({ snapshot }: { snapshot: Snapshot | null }) {
  const buy = snapshot?.buyCount ?? 0;
  const sell = snapshot?.sellCount ?? 0;
  const total = buy + sell;
  const buyPct = total === 0 ? 50 : Math.round((buy / total) * 100);
  const sellPct = 100 - buyPct;
  const label =
    snapshot?.bias === "buy"
      ? "Bias BUY"
      : snapshot?.bias === "sell"
        ? "Bias SELL"
        : "Bias neutrale";

  return (
    <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">{label}</h2>
        <p className="font-mono text-xs tabular-nums text-muted">
          {snapshot ? `${buy} buy · ${sell} sell` : "—"}
        </p>
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-bg-subtle">
        <div
          className="bg-buy transition-[width] duration-500"
          style={{ width: `${buyPct}%` }}
        />
        <div
          className="bg-sell transition-[width] duration-500"
          style={{ width: `${sellPct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span className="tabular-nums">{buyPct}% buy</span>
        <span className="tabular-nums">{sellPct}% sell</span>
      </div>
    </article>
  );
}

export function TotalsRow({ snapshot }: { snapshot: Snapshot | null }) {
  const total = snapshot?.totalPosts ?? 0;
  const entries = (snapshot?.buyCount ?? 0) + (snapshot?.sellCount ?? 0);
  return (
    <p className="text-sm text-muted">
      Totale classificati{" "}
      <span className="font-mono tabular-nums text-fg">{snapshot ? total : "—"}</span>
      <span className="mx-2 text-subtle">/</span>
      Entrate{" "}
      <span className="font-mono tabular-nums text-fg">{snapshot ? entries : "—"}</span>
      <span className="mx-2 text-subtle">/</span>
      Finestra {snapshot?.windowMinutes ?? 15} min
    </p>
  );
}
