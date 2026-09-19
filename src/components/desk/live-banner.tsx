import { LIVE_UNAVAILABLE } from "@/lib/xau/types";

export function LiveUnavailableBanner() {
  return (
    <aside
      role="alert"
      className="rounded-xl bg-sell-dim px-5 py-5 shadow-[var(--shadow-border)]"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sell">
        {LIVE_UNAVAILABLE}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg">
        La ricerca live su X per XAUUSD/Gold non è disponibile in questo momento. Non
        mostro dati seed, demo o simulati. Riprova tra pochi minuti o premi Aggiorna.
      </p>
    </aside>
  );
}
