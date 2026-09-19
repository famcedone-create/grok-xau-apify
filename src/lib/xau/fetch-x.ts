import { LIVE_UNAVAILABLE, type RawPost, type ScanSource } from "./types";

const STATUS_ONE =
  /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/i;

const APIFY_ACTOR = "feedminer~x-tweet-scraper";
const MAX_ITEMS = 30;

type FetchResult = {
  posts: RawPost[];
  source: ScanSource;
  error: string | null;
  live: boolean;
};

type ApifyTweet = {
  id?: string | number;
  url?: string;
  text?: string;
  fullText?: string;
  createdAt?: string;
  likeCount?: number;
  author?: {
    userName?: string;
    username?: string;
    name?: string;
    profilePicture?: string;
    profileImageUrl?: string;
  };
};

export async function collectPosts(): Promise<FetchResult> {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    return { posts: [], source: "apify", error: LIVE_UNAVAILABLE, live: false };
  }

  try {
    const posts = await fetchViaApify(token);
    const valid = dedupe(posts.filter(isLivePost));
    return { posts: valid, source: "apify", error: null, live: true };
  } catch {
    return { posts: [], source: "apify", error: LIVE_UNAVAILABLE, live: false };
  }
}

async function fetchViaApify(token: string): Promise<RawPost[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50_000);

  try {
    const endpoint =
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items` +
      `?clean=true&format=json`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        searchTerms: [
          'XAUUSD (buy OR sell OR long OR short OR entry OR tp OR "take profit" OR target) -filter:replies',
          'Gold (buy OR sell OR long OR short OR entry OR tp OR "take profit" OR target) -filter:replies',
        ],
        maxItems: MAX_ITEMS,
        sort: "Latest",
        includeReplies: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Apify ${res.status}`);
    }

    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) throw new Error("Apify response is not an array");

    return body.map(mapTweet).filter((p): p is RawPost => Boolean(p));
  } finally {
    clearTimeout(timer);
  }
}

function mapTweet(item: unknown): RawPost | null {
  if (!item || typeof item !== "object") return null;
  const tweet = item as ApifyTweet;
  const id = tweet.id == null ? "" : String(tweet.id);
  const text = String(tweet.fullText ?? tweet.text ?? "").trim();
  if (!id || !/^\d+$/.test(id) || !text) return null;

  const parsed = parseStatusUrl(tweet.url);
  const handle = stripHandle(
    tweet.author?.userName ?? tweet.author?.username ?? parsed?.handle ?? "unknown",
  );
  const url = parsed?.id === id ? String(tweet.url) : canonicalUrl(handle, id);

  return {
    id,
    handle,
    name: tweet.author?.name,
    text: text.slice(0, 800),
    postedAt: toIso(tweet.createdAt),
    url,
    likes: typeof tweet.likeCount === "number" ? tweet.likeCount : undefined,
    avatar: tweet.author?.profilePicture ?? tweet.author?.profileImageUrl,
  };
}

function isLivePost(post: RawPost): boolean {
  if (!post.id || !/^\d+$/.test(post.id)) return false;
  if (!post.text || !post.text.trim()) return false;
  const parsed = parseStatusUrl(post.url);
  return Boolean(parsed && parsed.id === post.id);
}

function parseStatusUrl(url: string | undefined): { handle: string; id: string } | null {
  if (!url) return null;
  const match = url.match(STATUS_ONE);
  if (!match) return null;
  const handle = match[1];
  const id = match[2];
  if (!handle || handle.toLowerCase() === "i") return { handle: "unknown", id };
  return { handle, id };
}

function canonicalUrl(handle: string, id: string): string {
  return `https://x.com/${handle}/status/${id}`;
}

function dedupe(posts: RawPost[]): RawPost[] {
  const seen = new Set<string>();
  const out: RawPost[] = [];
  for (const p of posts) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function stripHandle(handle: string | undefined): string {
  const h = (handle ?? "").replace(/^@/, "").trim();
  return h || "unknown";
}

function toIso(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return new Date().toISOString();
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}
