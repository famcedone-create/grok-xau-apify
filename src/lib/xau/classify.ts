import type { ClassifiedPost, RawPost, Side, TpLevel, Bias } from "./types";

const STRONG_GOLD_MARK =
  /(?:\b(?:xauusd[m]?|xau\/usd|xauusdm)\b|(?:\$|#)xau(?:usd)?\b)/i;
const GOLD_WORD = /\bgold\b|\boro\b/i;

const TRADE_WORD =
  /\b(buy|sell|long|short|entry|tp\d*|take\s*profit|sl\b|stop\s*loss|chiud|compr|vend|target|support|resistance|pips?|scalp(?:ing)?|forex|setup|signal|analysis)\b/i;

const MARKET_CONTEXT =
  /\b(entry|tp\d*|take\s*profit|sl\b|stop\s*loss|buy\s+zone|sell\s+zone|support|resistance|pips?|scalp(?:ing)?|forex|xau(?:usd)?|target|setup|signal|analysis)\b/i;

const XAU_PRICE_RE =
  /\b(?:3[5-9]\d{2}|4\d{3}|5[0-4]\d{2})(?:\.\d{1,2})?\b/;

const EXCLUDE_CONTEXT =
  /\b(usdt|crypto|bitcoin|btc|ethereum|eth|solana|altcoin|token|memecoin|nft|necklace|jewel(?:ry)?|jewellery|diamond|diamonds|watch(?:es)?|marketplace|listed|for\s+sale|want\s+to\s+sell|wts\b|wtb\b|scrap\s+gold|karat|carat|harga|take\s+all|cosmos)\b/i;

const SPAM_HASHTAG =
  /(#gümüş|#platin|#bist100|#gramaltın|#cment|#coti|#g\/usdt)/i;

const SHORT_GOLD_SIGNAL =
  /^.{0,30}\bgold\s+(buy|sell|long|short)\b.{0,30}$/i;

const BUY_EXPLICIT_RE =
  /\b(entry\s+buy|buy\s+entry|buy\s+zone|buy\s+limit|buy\s+stop|buy\s+now|going\s+long|long\s+now|entrata\s+long|compro|acquisto)\b/i;
const SELL_EXPLICIT_RE =
  /\b(entry\s+sell|sell\s+entry|sell\s+zone|sell\s+limit|sell\s+stop|sell\s+now|going\s+short|short\s+now|entrata\s+short|vendo|vendita)\b/i;

const XAU_BUY_RE =
  /(?:\b(?:xauusd[m]?|xau\/usd)\b|(?:\$|#)xau(?:usd)?\b).{0,24}\b(?:buy|long)\b|\b(?:buy|long)\b.{0,24}(?:\b(?:xauusd[m]?|xau\/usd)\b|(?:\$|#)xau(?:usd)?\b)/i;
const XAU_SELL_RE =
  /(?:\b(?:xauusd[m]?|xau\/usd)\b|(?:\$|#)xau(?:usd)?\b).{0,24}\b(?:sell|short)\b|\b(?:sell|short)\b.{0,24}(?:\b(?:xauusd[m]?|xau\/usd)\b|(?:\$|#)xau(?:usd)?\b)/i;

const GOLD_BUY_RE =
  /\bgold\b.{0,18}\b(?:buy|long)\b|\b(?:buy|long)\b.{0,18}\bgold\b/i;
const GOLD_SELL_RE =
  /\bgold\b.{0,18}\b(?:sell|short)\b|\b(?:sell|short)\b.{0,18}\bgold\b/i;

const EXIT_RE =
  /\b(tp\s*hit|hit\s*tp|tp\s*done|closed|close\s+now|chiud[oa]|booked|breakeven|\bbe\b|sl\s*hit|stop\s*hit|exit\b|pips?\s+profit|profit\s+done|in\s+profit)/i;
const TP_HIT_RE = /\b(tp\s*[1-6]?\s*(hit|done|✅)|hit\s*tp|tp\s*hit|take[- ]profit.{0,12}(hit|achieved|done))/i;

const PRICE_RE = /\b(4[0-9]{3}(?:\.[0-9]{1,2})?)\b/g;
const TP_NEAR_RE =
  /(?:tp\s*[1-6]?|take\s*profits?|target[s]?|tp::?)\s*[:\-]?\s*(4[0-9]{3}(?:\.[0-9]{1,2})?)/gi;

export function isGoldRelated(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;

  if (EXCLUDE_CONTEXT.test(t)) return false;
  if (SPAM_HASHTAG.test(t)) return false;

  if (STRONG_GOLD_MARK.test(t)) return TRADE_WORD.test(t);

  if (!GOLD_WORD.test(t) || !TRADE_WORD.test(t)) return false;
  if (XAU_PRICE_RE.test(t)) return true;
  if (MARKET_CONTEXT.test(t)) return true;

  return t.length <= 90 && SHORT_GOLD_SIGNAL.test(t);
}

export function extractTps(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(TP_NEAR_RE)) {
    const n = Number(match[1]);
    if (n >= 3500 && n <= 5500) found.add(Math.round(n));
  }
  if (found.size === 0 && /\btp\b/i.test(text)) {
    for (const match of text.matchAll(PRICE_RE)) {
      const n = Number(match[1]);
      if (n >= 3500 && n <= 5500) found.add(Math.round(n));
    }
  }
  return [...found].sort((a, b) => a - b).slice(0, 8);
}

function hasBuySignal(text: string, goldRelated: boolean): boolean {
  if (!goldRelated) return false;

  if (BUY_EXPLICIT_RE.test(text)) return true;
  if (XAU_BUY_RE.test(text)) return true;

  const goldDirectional = GOLD_BUY_RE.test(text);
  if (goldDirectional) {
    const strongContext =
      text.length <= 120 ||
      XAU_PRICE_RE.test(text) ||
      /\b(entry|zone|tp\d*|take\s*profit|sl\b|stop\s*loss|target|signal)\b/i.test(text);
    if (strongContext) return true;
  }

  return (
    XAU_PRICE_RE.test(text) &&
    /\b(?:buy|long)\b/i.test(text) &&
    /\b(entry|zone|tp\d*|sl\b|target)\b/i.test(text)
  );
}

function hasSellSignal(text: string, goldRelated: boolean): boolean {
  if (!goldRelated) return false;

  if (SELL_EXPLICIT_RE.test(text)) return true;
  if (XAU_SELL_RE.test(text)) return true;

  const goldDirectional = GOLD_SELL_RE.test(text);
  if (goldDirectional) {
    const strongContext =
      text.length <= 120 ||
      XAU_PRICE_RE.test(text) ||
      /\b(entry|zone|tp\d*|take\s*profit|sl\b|stop\s*loss|target|signal)\b/i.test(text);
    if (strongContext) return true;
  }

  return (
    XAU_PRICE_RE.test(text) &&
    /\b(?:sell|short)\b/i.test(text) &&
    /\b(entry|zone|tp\d*|sl\b|target)\b/i.test(text)
  );
}

export function classifyPost(raw: RawPost): ClassifiedPost {
  const text = raw.text ?? "";
  const goldRelated = isGoldRelated(text);
  const isBuy = hasBuySignal(text, goldRelated);
  const isSell = hasSellSignal(text, goldRelated);
  const isExit = goldRelated && (EXIT_RE.test(text) || TP_HIT_RE.test(text));
  const tps = goldRelated ? extractTps(text) : [];
  const hasTp = goldRelated && (tps.length > 0 || /\btp\d*\b|take\s*profit/i.test(text));

  let side: Side = "none";
  if (isBuy && isSell) side = "mixed";
  else if (isBuy) side = "buy";
  else if (isSell) side = "sell";
  else if (isExit) side = "exit";

  return {
    ...raw,
    text: text.slice(0, 480),
    goldRelated,
    isBuy,
    isSell,
    isExit,
    hasTp,
    tps,
    side,
  };
}

export function classifyAll(raw: RawPost[]): ClassifiedPost[] {
  const seen = new Set<string>();
  const out: ClassifiedPost[] = [];
  for (const post of raw) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    const c = classifyPost(post);
    if (!c.goldRelated) continue;
    if (c.side === "none" && !c.hasTp) continue;
    out.push(c);
  }
  return out.sort(
    (a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt),
  );
}

export function summarize(posts: ClassifiedPost[]): {
  buyCount: number;
  sellCount: number;
  exitCount: number;
  tpCount: number;
  totalPosts: number;
  bias: Bias;
  tps: TpLevel[];
  summary: string;
} {
  const buyCount = posts.filter((p) => p.isBuy).length;
  const sellCount = posts.filter((p) => p.isSell).length;
  const exitCount = posts.filter((p) => p.isExit).length;
  const tpCount = posts.filter((p) => p.hasTp).length;
  const totalPosts = posts.length;

  const tpMap = new Map<number, TpLevel>();
  for (const post of posts) {
    for (const price of post.tps) {
      const cur = tpMap.get(price) ?? { price, count: 0, sides: [] };
      cur.count += 1;
      if (post.isBuy && !cur.sides.includes("buy")) cur.sides.push("buy");
      if (post.isSell && !cur.sides.includes("sell")) cur.sides.push("sell");
      tpMap.set(price, cur);
    }
  }
  const tps = [...tpMap.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  let bias: Bias = "neutral";
  if (buyCount > sellCount + 1) bias = "buy";
  else if (sellCount > buyCount + 1) bias = "sell";

  const summary = buildSummary({ buyCount, sellCount, exitCount, tpCount, totalPosts, bias, tps });
  return { buyCount, sellCount, exitCount, tpCount, totalPosts, bias, tps, summary };
}

function buildSummary(s: {
  buyCount: number;
  sellCount: number;
  exitCount: number;
  tpCount: number;
  totalPosts: number;
  bias: Bias;
  tps: TpLevel[];
}): string {
  if (s.totalPosts === 0) {
    return "Nessun post di trading su XAUUSD/Gold nella finestra. Riprova alla prossima scansione.";
  }
  const lean =
    s.bias === "buy"
      ? "prevalgono le entrate BUY"
      : s.bias === "sell"
        ? "prevalgono le entrate SELL"
        : "il flusso è equilibrato";
  const tpHint =
    s.tps.length > 0
      ? ` TP più citati: ${s.tps
          .slice(0, 3)
          .map((t) => t.price.toString())
          .join(", ")}.`
      : "";
  return `${s.totalPosts} post classificati: ${s.buyCount} buy, ${s.sellCount} sell, ${s.exitCount} uscite, ${s.tpCount} con TP. Sul nastro ${lean}.${tpHint}`;
}

export function filterByWindow(
  posts: ClassifiedPost[],
  windowMinutes: number,
  now = Date.now(),
): ClassifiedPost[] {
  const cut = now - windowMinutes * 60_000;
  return posts.filter((p) => {
    const t = Date.parse(p.postedAt);
    return Number.isFinite(t) && t >= cut;
  });
}
