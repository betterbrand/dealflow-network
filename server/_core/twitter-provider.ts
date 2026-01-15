/**
 * Twitter/X data provider using Apify
 *
 * Provides interface for fetching Twitter profiles and tweets via Apify's Twitter scraper.
 * Used for profile import and tweet analysis features.
 */

import { ENV } from "./env";

/**
 * Twitter profile data structure
 */
export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  profileImageUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  createdAt: string | null;
  pinnedTweetId?: string | null;
}

/**
 * Tweet data structure
 */
export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
  isRetweet: boolean;
  isReply: boolean;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  media?: Array<{
    type: string;
    url: string;
  }>;
}

/**
 * Result from fetching profile with optional tweets
 */
export interface TwitterFetchResult {
  profile: TwitterProfile;
  tweets?: Tweet[];
}

/**
 * Check if Twitter provider is available (Apify API key configured)
 */
export function isTwitterProviderAvailable(): boolean {
  return !!ENV.apifyApiKey;
}

/**
 * Extract username from various Twitter URL formats
 *
 * Handles:
 * - https://twitter.com/username
 * - https://x.com/username
 * - https://www.twitter.com/username
 * - @username
 * - username
 */
export function extractUsernameFromUrl(input: string): string {
  const trimmed = input.trim();

  // Handle @username format
  if (trimmed.startsWith("@")) {
    return trimmed.slice(1);
  }

  // Handle URL formats
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i,
  ];

  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      // Filter out reserved paths
      const reserved = ["home", "explore", "notifications", "messages", "search", "settings", "i"];
      if (!reserved.includes(match[1].toLowerCase())) {
        return match[1];
      }
    }
  }

  // Assume it's a raw username if no URL pattern matched and it looks like a username
  if (/^[a-zA-Z0-9_]{1,15}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Invalid Twitter URL or username: ${input}`);
}

/**
 * Build a Twitter profile URL from username
 */
export function buildTwitterUrl(username: string): string {
  return `https://x.com/${username}`;
}

/**
 * Fetch Twitter profile using Apify
 *
 * @param profileUrl - Twitter profile URL or @username
 * @returns TwitterProfile object
 */
export async function fetchTwitterProfile(profileUrl: string): Promise<TwitterProfile> {
  if (!isTwitterProviderAvailable()) {
    throw new Error("Twitter provider not configured. Set APIFY_API_KEY environment variable.");
  }

  const username = extractUsernameFromUrl(profileUrl);
  console.log(`[Twitter Provider] Fetching profile for @${username}`);

  const actorId = ENV.apifyTwitterActorId.replace("/", "~");
  const apiUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.apifyApiKey}`,
    },
    body: JSON.stringify({
      handles: [username],
      maxItems: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twitter Provider] Apify API error: ${response.status}`, errorText);
    throw new Error(`Failed to fetch Twitter profile: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No profile data returned for @${username}`);
  }

  const rawProfile = data[0];
  const profile = normalizeApifyProfile(rawProfile);

  console.log(`[Twitter Provider] Successfully fetched profile for @${username}`);
  console.log(`[Twitter Provider] Followers: ${profile.followersCount}, Tweets: ${profile.tweetCount}`);

  return profile;
}

/**
 * Fetch Twitter profile with recent tweets
 *
 * @param profileUrl - Twitter profile URL or @username
 * @param tweetCount - Number of tweets to fetch (default: 50, max: 100)
 * @returns TwitterFetchResult with profile and tweets
 */
export async function fetchTwitterProfileWithTweets(
  profileUrl: string,
  tweetCount: number = 50
): Promise<TwitterFetchResult> {
  if (!isTwitterProviderAvailable()) {
    throw new Error("Twitter provider not configured. Set APIFY_API_KEY environment variable.");
  }

  const username = extractUsernameFromUrl(profileUrl);
  console.log(`[Twitter Provider] Fetching profile and ${tweetCount} tweets for @${username}`);

  const actorId = ENV.apifyTwitterActorId.replace("/", "~");
  const apiUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.apifyApiKey}`,
    },
    body: JSON.stringify({
      handles: [username],
      maxItems: Math.min(tweetCount, 100),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Twitter Provider] Apify API error: ${response.status}`, errorText);
    throw new Error(`Failed to fetch Twitter data: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No data returned for @${username}`);
  }

  // Extract profile from first tweet's user object (quacker format)
  const firstItem = data[0];
  const rawUser = firstItem.user || firstItem;
  const profile = normalizeApifyProfile(rawUser);

  // Extract tweets from the response
  const tweets: Tweet[] = [];
  for (const item of data) {
    if (item.id_str || item.full_text) {
      const tweet = normalizeApifyTweet(item);
      if (tweet) {
        tweets.push(tweet);
      }
    }
  }

  console.log(`[Twitter Provider] Fetched ${tweets.length} tweets for @${username}`);

  return { profile, tweets };
}

/**
 * Fetch only tweets for a Twitter user (for analysis refresh)
 *
 * @param profileUrl - Twitter profile URL or @username
 * @param tweetCount - Number of tweets to fetch
 * @returns Array of tweets
 */
export async function fetchTwitterTweets(
  profileUrl: string,
  tweetCount: number = 50
): Promise<Tweet[]> {
  const result = await fetchTwitterProfileWithTweets(profileUrl, tweetCount);
  return result.tweets || [];
}

/**
 * Normalize Apify's raw profile data to our TwitterProfile interface
 */
function normalizeApifyProfile(raw: Record<string, unknown>): TwitterProfile {
  return {
    id: String(raw.id || raw.id_str || raw.rest_id || ""),
    username: String(raw.screen_name || raw.username || ""),
    name: String(raw.name || raw.full_name || ""),
    bio: raw.description ? String(raw.description) : null,
    location: raw.location ? String(raw.location) : null,
    website: extractWebsite(raw),
    profileImageUrl: raw.profile_image_url_https
      ? String(raw.profile_image_url_https).replace("_normal", "_400x400")
      : raw.profile_image_url
        ? String(raw.profile_image_url)
        : null,
    bannerUrl: raw.profile_banner_url ? String(raw.profile_banner_url) : null,
    verified: Boolean(raw.verified || raw.is_blue_verified),
    followersCount: Number(raw.followers_count || raw.followersCount || 0),
    followingCount: Number(raw.friends_count || raw.followingCount || raw.following_count || 0),
    tweetCount: Number(raw.statuses_count || raw.tweetCount || raw.tweets_count || 0),
    createdAt: raw.created_at ? String(raw.created_at) : null,
    pinnedTweetId: raw.pinned_tweet_id_str ? String(raw.pinned_tweet_id_str) : null,
  };
}

/**
 * Extract website URL from profile data
 */
function extractWebsite(raw: Record<string, unknown>): string | null {
  // Try direct url field
  if (raw.url && typeof raw.url === "string") {
    return raw.url;
  }

  // Try entities.url.urls array (Twitter API v1 format)
  const entities = raw.entities as Record<string, unknown> | undefined;
  if (entities?.url) {
    const urlEntity = entities.url as Record<string, unknown>;
    if (Array.isArray(urlEntity.urls) && urlEntity.urls.length > 0) {
      const expanded = urlEntity.urls[0].expanded_url;
      if (expanded) return String(expanded);
    }
  }

  return null;
}

/**
 * Normalize Apify's raw tweet data to our Tweet interface
 */
function normalizeApifyTweet(raw: Record<string, unknown>): Tweet | null {
  // Skip if no ID (likely not a tweet)
  if (!raw.id && !raw.id_str) {
    return null;
  }

  const text = String(raw.full_text || raw.text || "");
  const isRetweet = text.startsWith("RT @") || Boolean(raw.retweeted_status);
  const isReply = Boolean(raw.in_reply_to_status_id_str || raw.in_reply_to_user_id_str);

  // Extract hashtags
  const hashtags: string[] = [];
  const hashtagEntities = (raw.entities as Record<string, unknown>)?.hashtags;
  if (Array.isArray(hashtagEntities)) {
    for (const ht of hashtagEntities) {
      if (ht.text) hashtags.push(String(ht.text));
    }
  }

  // Extract mentions
  const mentions: string[] = [];
  const mentionEntities = (raw.entities as Record<string, unknown>)?.user_mentions;
  if (Array.isArray(mentionEntities)) {
    for (const m of mentionEntities) {
      if (m.screen_name) mentions.push(String(m.screen_name));
    }
  }

  // Extract URLs
  const urls: string[] = [];
  const urlEntities = (raw.entities as Record<string, unknown>)?.urls;
  if (Array.isArray(urlEntities)) {
    for (const u of urlEntities) {
      if (u.expanded_url) urls.push(String(u.expanded_url));
    }
  }

  // Extract media
  const media: Array<{ type: string; url: string }> = [];
  const mediaEntities = (raw.entities as Record<string, unknown>)?.media ||
    (raw.extended_entities as Record<string, unknown>)?.media;
  if (Array.isArray(mediaEntities)) {
    for (const m of mediaEntities) {
      media.push({
        type: String(m.type || "photo"),
        url: String(m.media_url_https || m.media_url || ""),
      });
    }
  }

  return {
    id: String(raw.id_str || raw.id),
    text,
    createdAt: String(raw.created_at || new Date().toISOString()),
    retweetCount: Number(raw.retweet_count || 0),
    likeCount: Number(raw.favorite_count || raw.like_count || 0),
    replyCount: Number(raw.reply_count || 0),
    quoteCount: Number(raw.quote_count || 0),
    isRetweet,
    isReply,
    hashtags,
    mentions,
    urls,
    media: media.length > 0 ? media : undefined,
  };
}
