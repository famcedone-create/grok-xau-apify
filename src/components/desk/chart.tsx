import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint, TpLevel } from "@/lib/xau/types";

function formatTick(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function FlowChart({ history }: { history: HistoryPoint[] }) {
  const data = history.length > 0 ? history : [];
  return (
    <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">Flusso nel tempo</h2>
        <p className="text-xs text-muted">Buy vs sell, scansioni da 5 min</p>
      </div>
      {data.length < 2 ? (
        <p className="flex h-44 items-center text-sm text-muted">
          Servono almeno due scansioni per il grafico. Resta sulla desk: si aggiorna da sola.
        </p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgb(236 238 241 / 0.06)" vertical={false} />
              <XAxis
                dataKey="scannedAt"
                tickFormatter={formatTick}
                tick={{ fill: "#8b909a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#8b909a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "#12141a",
                  border: "1px solid rgb(236 238 241 / 0.12)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(v) => formatTick(String(v))}
              />
              <Area
                type="monotone"
                dataKey="buyCount"
                name="Buy"
                stroke="#3f9d73"
                fill="#3f9d73"
                fillOpacity={0.18}
                strokeWidth={1.75}
              />
              <Area
                type="monotone"
                dataKey="sellCount"
                name="Sell"
                stroke="#d15c52"
                fill="#d15c52"
                fillOpacity={0.16}
                strokeWidth={1.75}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

export function TpBoard({ tps }: { tps: TpLevel[] }) {
  return (
    <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-sm font-medium text-fg">Possibili TP</h2>
      <p className="mt-1 text-xs text-muted">Livelli citati nei post, raggruppati</p>
      {tps.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nessun target numerico nella finestra.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {tps.map((tp) => (
            <li
              key={tp.price}
              className="flex items-center gap-2 rounded-md bg-bg-subtle px-3 py-2"
            >
              <span className="font-mono text-sm tabular-nums text-fg">{tp.price}</span>
              <span className="font-mono text-xs tabular-nums text-muted">×{tp.count}</span>
              <span className="text-[11px] uppercase tracking-wide text-subtle">
                {tp.sides.length === 0
                  ? "tp"
                  : tp.sides.includes("buy") && tp.sides.includes("sell")
                    ? "mix"
                    : tp.sides[0]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
