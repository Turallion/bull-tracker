export type TweetMetrics = {
  likes: number;
  reposts: number;
  replies: number;
  bookmarks: number;
  quotes: number;
  impressions?: number;
};

export type TweetSample = {
  id: string;
  text: string;
  createdAt?: string;
  metrics: TweetMetrics;
};

export type ProfileSnapshot = {
  name: string;
  username: string;
  avatarUrl: string;
  subscribers: number;
  followers?: number;
  bio?: string;
};

export type AnalyzerInput = {
  profile: ProfileSnapshot;
  tweets: TweetSample[];
};

export type EstimateLevel = {
  name: string;
  comment: string;
};

export type AnalyzerResult = {
  profile: ProfileSnapshot;
  tweetsAnalyzed: number;
  lowerMonthly: number;
  upperMonthly: number;
  level: EstimateLevel;
  baseLowerMonthly: number;
  baseUpperMonthly: number;
  engagementMultiplier: number;
  consistencyBonus: number;
  engagementRate: number;
  weightedInteractions: number;
  isDemo?: boolean;
};
