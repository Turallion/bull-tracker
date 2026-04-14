import { NextRequest, NextResponse } from "next/server";
import { estimateBullEarnings } from "@/lib/scoring";
import type { AnalyzerInput, ProfileSnapshot, TweetSample } from "@/lib/types";

const API_BASE_URL = "https://api.twitterapi.io";
const BETWEEN_REQUEST_DELAY_MS = 1200;
const RATE_LIMIT_RETRY_DELAY_MS = 1800;
const MAX_RATE_LIMIT_RETRIES = 1;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getNestedValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, source);
}

function findAudienceCount(source: unknown): number {
  const candidatePaths = [
    "followers_count",
    "followersCount",
    "followers",
    "subscribers_count",
    "subscribersCount",
    "subscribers",
    "public_metrics.followers_count",
    "publicMetrics.followersCount",
    "legacy.followers_count",
    "legacy.followersCount",
    "data.followers_count",
    "data.followersCount",
    "data.followers",
    "data.subscribers_count",
    "data.subscribersCount",
    "data.subscribers",
    "user.followers_count",
    "user.followersCount",
    "user.followers",
    "user.subscribers_count",
    "user.subscribersCount",
    "user.subscribers"
  ];

  for (const path of candidatePaths) {
    const value = parseCount(getNestedValue(source, path));

    if (value > 0) {
      return value;
    }
  }

  if (!source || typeof source !== "object") {
    return 0;
  }

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (/(followers|subscribers)/i.test(key)) {
      const parsed = parseCount(value);

      if (parsed > 0) {
        return parsed;
      }
    }

    if (value && typeof value === "object") {
      const nested = findAudienceCount(value);

      if (nested > 0) {
        return nested;
      }
    }
  }

  return 0;
}

function normalizeProfile(payload: any, username: string): ProfileSnapshot {
  const user = payload?.data ?? payload?.user ?? payload;
  const followers = findAudienceCount(user) || findAudienceCount(payload);

  return {
    name: user?.name ?? username,
    username: user?.screen_name ?? user?.userName ?? user?.username ?? username,
    avatarUrl:
      user?.profile_image_url_https ??
      user?.profilePicture ??
      user?.profile_image_url ??
      "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png",
    subscribers: followers,
    followers,
    bio: user?.description ?? user?.bio ?? ""
  };
}

function normalizeTweets(payload: any): TweetSample[] {
  const rows = payload?.tweets ?? payload?.data?.tweets ?? payload?.data ?? payload?.results ?? [];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.slice(0, 20).map((tweet: any) => ({
    id: String(tweet?.id ?? tweet?.tweet_id ?? crypto.randomUUID()),
    text: tweet?.text ?? "",
    createdAt: tweet?.created_at ?? tweet?.createdAt,
    metrics: {
      likes: parseCount(tweet?.favorite_count) || parseCount(tweet?.likeCount),
      reposts: parseCount(tweet?.retweet_count) || parseCount(tweet?.retweetCount),
      replies: parseCount(tweet?.reply_count) || parseCount(tweet?.replyCount),
      bookmarks: parseCount(tweet?.bookmark_count) || parseCount(tweet?.bookmarkCount),
      quotes: parseCount(tweet?.quote_count) || parseCount(tweet?.quoteCount),
      impressions: parseCount(tweet?.view_count) || parseCount(tweet?.viewCount)
    }
  }));
}

function seededNumber(seed: string, min: number, max: number) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return min + (hash % (max - min + 1));
}

function buildFallbackTweets(username: string, subscribers: number): TweetSample[] {
  return Array.from({ length: 20 }, (_, index) => ({
    id: `${username}-${index}`,
    text: `Demo tweet ${index + 1}`,
    metrics: {
      likes: seededNumber(`${username}-likes-${index}`, 30, Math.max(120, Math.round(subscribers * 0.08))),
      reposts: seededNumber(`${username}-reposts-${index}`, 5, Math.max(18, Math.round(subscribers * 0.015))),
      replies: seededNumber(`${username}-replies-${index}`, 4, Math.max(12, Math.round(subscribers * 0.01))),
      bookmarks: seededNumber(`${username}-bookmarks-${index}`, 2, Math.max(10, Math.round(subscribers * 0.008))),
      quotes: seededNumber(`${username}-quotes-${index}`, 1, Math.max(6, Math.round(subscribers * 0.004)))
    }
  }));
}

function buildFallbackInput(username: string): AnalyzerInput {
  const subscribers = seededNumber(`${username}-subs`, 800, 28000);
  const name = username
    .split(/[_\-.]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || username;
  const tweets = buildFallbackTweets(username, subscribers);

  return {
    profile: {
      name,
      username,
      avatarUrl: `https://unavatar.io/x/${encodeURIComponent(username)}`,
      subscribers
    },
    tweets
  };
}

function buildHybridFallbackInput(profile: ProfileSnapshot): AnalyzerInput {
  const tweets: TweetSample[] = Array.from({ length: 20 }, (_, index) => ({
    id: `${profile.username}-${index}`,
    text: `Demo tweet ${index + 1}`,
    metrics: {
      likes: seededNumber(`${profile.username}-likes-${index}`, 30, Math.max(120, Math.round(profile.subscribers * 0.08))),
      reposts: seededNumber(`${profile.username}-reposts-${index}`, 5, Math.max(18, Math.round(profile.subscribers * 0.015))),
      replies: seededNumber(`${profile.username}-replies-${index}`, 4, Math.max(12, Math.round(profile.subscribers * 0.01))),
      bookmarks: seededNumber(`${profile.username}-bookmarks-${index}`, 2, Math.max(10, Math.round(profile.subscribers * 0.008))),
      quotes: seededNumber(`${profile.username}-quotes-${index}`, 1, Math.max(6, Math.round(profile.subscribers * 0.004)))
    }
  }));

  return {
    profile,
    tweets
  };
}

async function fetchJson(path: string) {
  const apiKey = process.env.TWITTERAPI_IO_KEY;

  if (!apiKey) {
    throw new Error("Missing TWITTERAPI_IO_KEY. Add it to your local env or Vercel project.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "X-API-Key": apiKey
    },
    cache: "no-store"
  });

  if (response.status === 429) {
    throw new Error(
      "twitterapi.io rate limit reached. Your API key is working, but the service is temporarily blocking more requests. Wait a bit or check your twitterapi.io plan limits."
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "twitterapi.io rejected the API key. Double-check the TWITTERAPI_IO_KEY value in .env.local."
    );
  }

  if (!response.ok) {
    throw new Error(`twitterapi.io returned ${response.status}.`);
  }

  return response.json();
}

async function fetchJsonWithRetry(path: string, retriesLeft = MAX_RATE_LIMIT_RETRIES): Promise<any> {
  try {
    return await fetchJson(path);
  } catch (error) {
    if (
      retriesLeft > 0 &&
      error instanceof Error &&
      error.message.includes("rate limit reached")
    ) {
      await sleep(RATE_LIMIT_RETRY_DELAY_MS);
      return fetchJsonWithRetry(path, retriesLeft - 1);
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").replace(/^@/, "").trim();

    if (!username) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    try {
      const profilePayload = await fetchJsonWithRetry(
        `/twitter/user/info?userName=${encodeURIComponent(username)}`
      );
      const profile = normalizeProfile(profilePayload, username);

      if (profile.subscribers <= 0) {
        return NextResponse.json(
          { error: "This account does not expose enough audience data for an estimate yet." },
          { status: 422 }
        );
      }

      await sleep(BETWEEN_REQUEST_DELAY_MS);
      try {
        const tweetsPayload = await fetchJsonWithRetry(
          `/twitter/user/last_tweets?userName=${encodeURIComponent(username)}&count=20`
        );
        const result = estimateBullEarnings({
          profile,
          tweets: normalizeTweets(tweetsPayload)
        });
        return NextResponse.json({ result });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("rate limit reached")
        ) {
          const result = estimateBullEarnings(buildHybridFallbackInput(profile));
          result.isDemo = true;
          return NextResponse.json({ result });
        }

        throw error;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("rate limit reached")
      ) {
        return NextResponse.json(
          {
            error:
              "Could not load real profile data right now because twitterapi.io hit a rate limit. Try again in a bit."
          },
          { status: 429 }
        );
      }

      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
