import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LIVE_UNAVAILABLE, type ClassifiedPost, type Side } from "@/lib/xau/types";

const SIDE_STYLE: Record<Side, { label: string; className: string }> = {
  buy: { label: "BUY", className: "bg-buy-dim text-buy" },
  sell: { label: "SELL", className: "bg-sell-dim text-sell" },
  exit: { label: "USCITA", className: "bg-exit-dim text-exit" },
  mixed: { label: "MIX", className: "bg-bg-subtle text-muted" },
  none: { label: "TP", className: "bg-tp-dim text-tp" },
};

function relative(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return formatDistanceToNow(t, { addSuffix: true, locale: it });
}

export function PostFeed({
  posts,
  unavailable = false,
}: {
  posts: ClassifiedPost[];
  unavailable?: boolean;
}) {
  return (
    <article className="rounded-xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">Nastro X</h2>
        <p className="text-xs text-muted">{unavailable ? "—" : `${posts.length} post`}</p>
      </div>
      {unavailable ? (
        <p className="py-10 text-sm font-medium uppercase tracking-[0.12em] text-sell">
          {LIVE_UNAVAILABLE}
        </p>
      ) : posts.length === 0 ? (
        <p className="py-10 text-sm text-muted">
          Nessuna entrata o uscita su XAUUSD in questa finestra.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {posts.slice(0, 40).map((post) => {
            const side = SIDE_STYLE[post.side] ?? SIDE_STYLE.none;
            return (
              <li key={post.id} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md outline-none transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-fg">@{post.handle}</span>
                    <span className="text-xs text-subtle">{relative(post.postedAt)}</span>
                    <Badge className={cn("ml-auto", side.className)}>{side.label}</Badge>
                    {post.hasTp && post.side !== "none" ? (
                      <Badge className="bg-tp-dim text-tp">TP</Badge>
                    ) : null}
                    {post.isExit && post.side !== "exit" ? (
                      <Badge className="bg-exit-dim text-exit">uscita</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-muted">
                    {post.text}
                  </p>
                  {post.tps.length > 0 ? (
                    <p className="mt-1.5 font-mono text-xs tabular-nums text-tp">
                      TP {post.tps.join(" · ")}
                    </p>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
