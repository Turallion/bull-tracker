import { AnalyzerInput, AnalyzerResult, EstimateLevel, TweetSample } from "@/lib/types";

const LEVELS: Array<{ min: number; name: string; comments: string[] }> = [
  {
    min: 0,
    name: "Paper Hands",
    comments: [
      "Bull season sees potential, but the bags are still in tutorial mode.",
      "You are warming up. The candles are interested, not convinced.",
      "The alpha is there. The timeline just needs a stronger dose."
    ]
  },
  {
    min: 750,
    name: "Dip Buyer",
    comments: [
      "Not bad. You are one clean thread away from becoming a problem.",
      "You buy fear, post through chop, and the market is noticing.",
      "This is where side quests start turning into actual income."
    ]
  },
  {
    min: 2500,
    name: "Pump Chaser",
    comments: [
      "The timeline is watching and the bags are beginning to print.",
      "Your posts have started moving faster than most alt rotations.",
      "Momentum is real. Even CT lurkers might be bookmarking your takes."
    ]
  },
  {
    min: 7000,
    name: "Whale Signal",
    comments: [
      "At this point, one good post can set half the feed into motion.",
      "You are not farming engagement anymore. Engagement is farming you.",
      "This account has enough gravity to bend the timeline."
    ]
  },
  {
    min: 18000,
    name: "Cycle Legend",
    comments: [
      "You are not posting. You are causing candles.",
      "The market is one part euphoria and one part your notifications tab.",
      "If this bull run had a soundtrack, your account would be on it."
    ]
  }
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roundMoney = (amount: number) => {
  if (amount >= 10000) {
    return Math.round(amount / 100) * 100;
  }

  if (amount >= 1000) {
    return Math.round(amount / 50) * 50;
  }

  return Math.round(amount / 10) * 10;
};

const capRangeUpperBound = (lower: number, upper: number, maxSpread = 0.2) => {
  const maxUpper = roundMoney(lower * (1 + maxSpread));
  return Math.max(lower, Math.min(upper, maxUpper));
};

const capRangeAbsoluteMax = (lower: number, upper: number, absoluteMax: number) => {
  const cappedMax = Math.max(0, roundMoney(absoluteMax));
  const cappedLower = Math.min(lower, cappedMax);
  const cappedUpper = Math.min(upper, cappedMax);
  return {
    lower: cappedLower,
    upper: Math.max(cappedLower, cappedUpper)
  };
};

const calcWeightedInteractions = (tweets: TweetSample[]) =>
  tweets.reduce((sum, tweet) => {
    const { likes, reposts, replies, bookmarks, quotes } = tweet.metrics;
    return sum + likes + reposts * 2 + replies * 2.5 + bookmarks * 3 + quotes * 3;
  }, 0);

const calcConsistencyBonus = (tweets: TweetSample[]) => {
  if (!tweets.length) {
    return 0;
  }

  const perTweet = tweets.map((tweet) => {
    const { likes, reposts, replies, bookmarks, quotes } = tweet.metrics;
    return likes + reposts * 2 + replies * 2.5 + bookmarks * 3 + quotes * 3;
  });

  const avg = perTweet.reduce((sum, value) => sum + value, 0) / perTweet.length;
  const hits = perTweet.filter((value) => value >= avg * 0.6).length;
  return clamp((hits / perTweet.length - 0.35) * 0.12, 0, 0.12);
};

const calcLargeAccountPenalty = (
  subscribers: number,
  tweets: TweetSample[],
  weightedInteractions: number
) => {
  if (subscribers < 10000) {
    return 0;
  }

  const sizeFactor = clamp((subscribers - 10000) / 25000, 0, 1);
  const tweetCount = tweets.length;
  const totalImpressions = tweets.reduce((sum, tweet) => sum + (tweet.metrics.impressions ?? 0), 0);
  const avgImpressionsPerTweet = tweetCount ? totalImpressions / tweetCount : 0;
  const impressionReachRatio = subscribers > 0 ? avgImpressionsPerTweet / subscribers : 0;
  const fallbackWeightedPerTweet = tweetCount ? weightedInteractions / tweetCount : 0;
  const fallbackReachRatio = subscribers > 0 ? fallbackWeightedPerTweet / subscribers : 0;
  const reachRatio = impressionReachRatio > 0 ? impressionReachRatio : fallbackReachRatio;

  // Large accounts with weak per-post output should be hit harder than small ones.
  const weakReachPenalty = clamp((0.12 - reachRatio) / 0.12, 0, 1) * (0.85 + sizeFactor * 0.65);
  const veryWeakReachPenalty = clamp((0.03 - reachRatio) / 0.03, 0, 1) * (0.55 + sizeFactor * 0.35);
  const postingPenalty =
    tweetCount >= 16 ? 0 : clamp((16 - tweetCount) / 16, 0, 1) * (0.3 + sizeFactor * 0.35);
  const inactivityPenalty =
    tweetCount >= 20 ? 0 : clamp((20 - tweetCount) / 20, 0, 1) * (0.12 + sizeFactor * 0.16);

  return weakReachPenalty + veryWeakReachPenalty + postingPenalty + inactivityPenalty;
};

const calcSmallCreatorBonus = (subscribers: number, tweets: TweetSample[]) => {
  if (subscribers <= 0 || subscribers >= 5000 || !tweets.length) {
    return 0;
  }

  const totalImpressions = tweets.reduce((sum, tweet) => sum + (tweet.metrics.impressions ?? 0), 0);
  const avgImpressionsPerTweet = totalImpressions / tweets.length;
  const reachRatio = avgImpressionsPerTweet / subscribers;
  const sizeFactor = clamp((5000 - subscribers) / 5000, 0, 1);

  const strongReachBonus = clamp((reachRatio - 0.6) / 0.9, 0, 1) * (0.18 + sizeFactor * 0.22);
  const breakoutBonus = clamp((reachRatio - 1.5) / 1.5, 0, 1) * (0.12 + sizeFactor * 0.18);
  const consistencyBonus = tweets.length >= 12 ? 0.05 * sizeFactor : 0;

  return strongReachBonus + breakoutBonus + consistencyBonus;
};

const pickLevel = (incomeMidpoint: number): EstimateLevel => {
  const level = [...LEVELS].reverse().find((candidate) => incomeMidpoint >= candidate.min) ?? LEVELS[0];
  const commentIndex = Math.abs(Math.round(incomeMidpoint)) % level.comments.length;
  return {
    name: level.name,
    comment: level.comments[commentIndex]
  };
};

const calcBaseRange = (subscribers: number) => {
  const tiers = [
    { cap: 1000, low: 1.25, high: 2.1 },
    { cap: 5000, low: 0.95, high: 1.6 },
    { cap: 15000, low: 0.72, high: 1.15 },
    { cap: 50000, low: 0.52, high: 0.86 },
    { cap: Infinity, low: 0.36, high: 0.58 }
  ];

  let remaining = subscribers;
  let lower = 0;
  let upper = 0;
  let previousCap = 0;

  for (const tier of tiers) {
    if (remaining <= 0) {
      break;
    }

    const tierWidth = tier.cap === Infinity ? remaining : tier.cap - previousCap;
    const used = Math.min(remaining, tierWidth);
    lower += used * tier.low;
    upper += used * tier.high;
    remaining -= used;
    previousCap = tier.cap;
  }

  const smallCreatorBoost = subscribers <= 3000 ? 1 + (3000 - subscribers) / 3000 * 0.12 : 1;
  return {
    lower: lower * smallCreatorBoost,
    upper: upper * smallCreatorBoost
  };
};

export function estimateBullEarnings(input: AnalyzerInput): AnalyzerResult {
  const subscribers = Math.max(input.profile.subscribers, 0);
  const tweets = input.tweets.slice(0, 20);
  const weightedInteractions = calcWeightedInteractions(tweets);
  const baseRange = calcBaseRange(subscribers);

  const normalizedSubscriberBase = Math.max(Math.sqrt(Math.max(subscribers, 1)) * 18, 40);
  const engagementRate = weightedInteractions / normalizedSubscriberBase;
  const consistencyBonus = calcConsistencyBonus(tweets);
  const largeAccountPenalty = calcLargeAccountPenalty(subscribers, tweets, weightedInteractions);
  const smallCreatorBonus = calcSmallCreatorBonus(subscribers, tweets);
  const engagementMultiplier = clamp(
    0.82 +
      Math.log10(engagementRate + 1) * 0.48 +
      consistencyBonus +
      smallCreatorBonus -
      largeAccountPenalty,
    0.25,
    1.95
  );

  const baseRangeSpreadCapped = {
    lower: roundMoney(baseRange.lower),
    upper: capRangeUpperBound(roundMoney(baseRange.lower), roundMoney(baseRange.upper))
  };
  const baseRangeFinal = capRangeAbsoluteMax(
    baseRangeSpreadCapped.lower,
    baseRangeSpreadCapped.upper,
    subscribers * 2
  );

  const monthlyRangeSpreadCapped = {
    lower: roundMoney(baseRange.lower * engagementMultiplier),
    upper: capRangeUpperBound(
      roundMoney(baseRange.lower * engagementMultiplier),
      roundMoney(baseRange.upper * (engagementMultiplier + 0.08))
    )
  };
  const monthlyRangeFinal = capRangeAbsoluteMax(
    monthlyRangeSpreadCapped.lower,
    monthlyRangeSpreadCapped.upper,
    subscribers * 3
  );
  const midpoint = (monthlyRangeFinal.lower + monthlyRangeFinal.upper) / 2;

  return {
    profile: input.profile,
    tweetsAnalyzed: tweets.length,
    lowerMonthly: monthlyRangeFinal.lower,
    upperMonthly: monthlyRangeFinal.upper,
    level: pickLevel(midpoint),
    baseLowerMonthly: baseRangeFinal.lower,
    baseUpperMonthly: baseRangeFinal.upper,
    engagementMultiplier: Number(engagementMultiplier.toFixed(2)),
    consistencyBonus: Number(consistencyBonus.toFixed(2)),
    engagementRate: Number(engagementRate.toFixed(2)),
    weightedInteractions: Math.round(weightedInteractions)
  };
}
