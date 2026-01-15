/**
 * Twitter Analysis Service
 *
 * LLM-powered analysis of tweets to extract:
 * - Sentiment and communication style
 * - Capabilities (what they can offer)
 * - Needs (what they're looking for)
 * - Opportunities (potential collaboration points)
 * - Topics and influence areas
 *
 * Enables semantic network matching: "who can help whom"
 */

import { invokeLLM, type Message } from "../_core/llm";
import type { Tweet, TwitterProfile } from "../_core/twitter-provider";
import type { TwitterAnalysisData } from "../_core/semantic-transformer";

/**
 * Full analysis result from LLM
 */
export interface TweetAnalysisResult {
  overallSentiment: "positive" | "neutral" | "negative" | "mixed";
  sentimentScore: number; // -100 to +100

  capabilities: Array<{
    name: string;
    confidence: number;
    evidence?: string;
  }>;

  needs: Array<{
    name: string;
    urgency: "low" | "medium" | "high";
    context?: string;
  }>;

  opportunities: Array<{
    title: string;
    description?: string;
    type?: string;
    confidence: number;
  }>;

  goals: Array<{
    goal: string;
    timeframe?: string;
    context?: string;
  }>;

  topics: Array<{
    topic: string;
    frequency: "frequent" | "occasional" | "rare";
    sentiment?: "positive" | "neutral" | "negative";
  }>;

  communicationStyle: "professional" | "casual" | "technical" | "promotional" | "thought_leader";

  personalityTraits: Array<{
    trait: string;
    confidence: number;
  }>;

  influenceScore: number; // 0-100
  influenceTopics: Array<{
    topic: string;
    score: number;
  }>;

  engagementPattern: {
    avgLikes: number;
    avgRetweets: number;
    avgReplies: number;
    postingFrequency: "daily" | "weekly" | "sporadic";
  };
}

/**
 * Prepare tweets for LLM analysis
 */
function prepareTweetsForAnalysis(tweets: Tweet[]): string {
  const tweetTexts = tweets
    .filter(t => !t.isRetweet) // Focus on original content
    .slice(0, 50) // Limit to most recent 50
    .map((t, i) => {
      const engagement = `[Likes: ${t.likeCount}, RTs: ${t.retweetCount}, Replies: ${t.replyCount}]`;
      const hashtags = t.hashtags.length > 0 ? ` #${t.hashtags.join(" #")}` : "";
      return `${i + 1}. ${t.text}${hashtags}\n   ${engagement} - ${t.createdAt}`;
    })
    .join("\n\n");

  return tweetTexts;
}

/**
 * Calculate engagement pattern from tweets
 */
function calculateEngagementPattern(tweets: Tweet[]): TweetAnalysisResult["engagementPattern"] {
  const originalTweets = tweets.filter(t => !t.isRetweet);
  if (originalTweets.length === 0) {
    return {
      avgLikes: 0,
      avgRetweets: 0,
      avgReplies: 0,
      postingFrequency: "sporadic",
    };
  }

  const avgLikes = Math.round(
    originalTweets.reduce((sum, t) => sum + t.likeCount, 0) / originalTweets.length
  );
  const avgRetweets = Math.round(
    originalTweets.reduce((sum, t) => sum + t.retweetCount, 0) / originalTweets.length
  );
  const avgReplies = Math.round(
    originalTweets.reduce((sum, t) => sum + t.replyCount, 0) / originalTweets.length
  );

  // Estimate posting frequency based on date range
  const dates = originalTweets
    .map(t => new Date(t.createdAt).getTime())
    .sort((a, b) => b - a);

  let postingFrequency: "daily" | "weekly" | "sporadic" = "sporadic";
  if (dates.length >= 2) {
    const dayRange = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24);
    const avgPerDay = originalTweets.length / Math.max(dayRange, 1);

    if (avgPerDay >= 0.5) postingFrequency = "daily";
    else if (avgPerDay >= 0.1) postingFrequency = "weekly";
  }

  return { avgLikes, avgRetweets, avgReplies, postingFrequency };
}

/**
 * JSON schema for LLM structured output
 */
const ANALYSIS_SCHEMA = {
  name: "twitter_analysis",
  schema: {
    type: "object",
    properties: {
      overallSentiment: {
        type: "string",
        enum: ["positive", "neutral", "negative", "mixed"],
        description: "Overall sentiment of the tweets",
      },
      sentimentScore: {
        type: "number",
        description: "Sentiment score from -100 (very negative) to +100 (very positive)",
      },
      capabilities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The capability/skill" },
            confidence: { type: "number", description: "Confidence 0-100" },
            evidence: { type: "string", description: "Tweet text supporting this" },
          },
          required: ["name", "confidence"],
        },
        description: "Skills and capabilities this person can offer to others",
      },
      needs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "What they need/are looking for" },
            urgency: { type: "string", enum: ["low", "medium", "high"] },
            context: { type: "string", description: "Context for this need" },
          },
          required: ["name", "urgency"],
        },
        description: "Things this person is looking for or needs help with",
      },
      opportunities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Opportunity title" },
            description: { type: "string", description: "Details" },
            type: { type: "string", description: "Type: hiring, partnership, investment, collaboration" },
            confidence: { type: "number", description: "Confidence 0-100" },
          },
          required: ["title", "confidence"],
        },
        description: "Potential opportunities for engagement or collaboration",
      },
      goals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            goal: { type: "string", description: "The goal" },
            timeframe: { type: "string", description: "Timeline if mentioned" },
            context: { type: "string", description: "Additional context" },
          },
          required: ["goal"],
        },
        description: "Professional or personal goals mentioned in tweets",
      },
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Topic/theme" },
            frequency: { type: "string", enum: ["frequent", "occasional", "rare"] },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          },
          required: ["topic", "frequency"],
        },
        description: "Main topics this person tweets about",
      },
      communicationStyle: {
        type: "string",
        enum: ["professional", "casual", "technical", "promotional", "thought_leader"],
        description: "How they communicate on Twitter",
      },
      personalityTraits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            trait: { type: "string", description: "Personality trait" },
            confidence: { type: "number", description: "Confidence 0-100" },
          },
          required: ["trait", "confidence"],
        },
        description: "Inferred personality traits",
      },
      influenceScore: {
        type: "number",
        description: "Overall influence score 0-100 based on content quality and engagement",
      },
      influenceTopics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            score: { type: "number", description: "Influence level 0-100" },
          },
          required: ["topic", "score"],
        },
        description: "Topics where this person has influence",
      },
    },
    required: [
      "overallSentiment",
      "sentimentScore",
      "capabilities",
      "needs",
      "opportunities",
      "topics",
      "communicationStyle",
      "influenceScore",
    ],
  },
  strict: true,
};

/**
 * Analyze tweets using LLM
 *
 * @param tweets - Array of tweets to analyze
 * @param profile - Twitter profile for context
 * @returns TweetAnalysisResult with all extracted insights
 */
export async function analyzeTweets(
  tweets: Tweet[],
  profile: TwitterProfile
): Promise<TweetAnalysisResult> {
  const tweetText = prepareTweetsForAnalysis(tweets);
  const engagementPattern = calculateEngagementPattern(tweets);

  if (!tweetText || tweetText.trim().length === 0) {
    console.warn("[Twitter Analysis] No tweets to analyze");
    return createEmptyAnalysis(engagementPattern);
  }

  const systemPrompt = `You are an expert at analyzing social media content to understand people professionally.
Your goal is to extract actionable insights that help identify:
1. CAPABILITIES: What can this person help others with? (skills, expertise, resources)
2. NEEDS: What is this person looking for? (hiring, partnerships, advice, connections)
3. OPPORTUNITIES: Where might there be mutual benefit with others in a professional network?

Be specific and evidence-based. Only include insights you can support with tweet content.
Focus on professional/business relevance for a networking context.`;

  const userPrompt = `Analyze these tweets from @${profile.username} (${profile.name}).

Profile context:
- Bio: ${profile.bio || "No bio"}
- Followers: ${profile.followersCount.toLocaleString()}
- Location: ${profile.location || "Unknown"}
- Verified: ${profile.verified ? "Yes" : "No"}

Recent tweets:
${tweetText}

Analyze their professional presence, communication style, and extract:
- What capabilities/expertise do they offer?
- What needs or challenges do they have?
- What collaboration opportunities exist?
- What topics are they influential in?

Return structured JSON analysis.`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const result = await invokeLLM(
      {
        messages,
        outputSchema: ANALYSIS_SCHEMA,
        maxTokens: 4096,
      },
      {
        temperature: 0.3, // Lower temperature for more consistent analysis
      }
    );

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Empty response from LLM");
    }

    // Strip markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const parsed = JSON.parse(jsonContent);
    // Handle nested analysis key if present
    const rawAnalysis = parsed.analysis || parsed;

    // Map LLM response to our expected schema (handles different field names)
    const capabilities = (rawAnalysis.capabilities || rawAnalysis.capabilities_expertise || []).map((c: unknown) =>
      typeof c === "string" ? { name: c, confidence: 80 } : c
    );
    const needs = (rawAnalysis.needs || rawAnalysis.needs_challenges || []).map((n: unknown) =>
      typeof n === "string" ? { name: n, urgency: "medium" as const } : n
    );
    const opportunities = (rawAnalysis.opportunities || rawAnalysis.collaboration_opportunities || []).map((o: unknown) =>
      typeof o === "string" ? { title: o, confidence: 70 } : o
    );
    const topics = (rawAnalysis.topics || rawAnalysis.influential_topics || []).map((t: unknown) =>
      typeof t === "string" ? { topic: t, frequency: "occasional" as const } : t
    );


    // Merge with calculated engagement pattern
    return {
      overallSentiment: rawAnalysis.overallSentiment || rawAnalysis.sentiment || "neutral",
      sentimentScore: rawAnalysis.sentimentScore ?? 0,
      capabilities,
      needs,
      opportunities,
      goals: rawAnalysis.goals || [],
      topics,
      communicationStyle: rawAnalysis.communicationStyle || rawAnalysis.professional_presence?.communication_style || "professional",
      personalityTraits: rawAnalysis.personalityTraits || [],
      influenceScore: rawAnalysis.influenceScore ?? 50,
      influenceTopics: rawAnalysis.influenceTopics || [],
      engagementPattern,
    };
  } catch (error) {
    console.error("[Twitter Analysis] LLM analysis failed:", error);
    // Return empty analysis on failure
    return createEmptyAnalysis(engagementPattern);
  }
}

/**
 * Create empty analysis result
 */
function createEmptyAnalysis(
  engagementPattern: TweetAnalysisResult["engagementPattern"]
): TweetAnalysisResult {
  return {
    overallSentiment: "neutral",
    sentimentScore: 0,
    capabilities: [],
    needs: [],
    opportunities: [],
    goals: [],
    topics: [],
    communicationStyle: "professional",
    personalityTraits: [],
    influenceScore: 0,
    influenceTopics: [],
    engagementPattern,
  };
}

/**
 * Convert full analysis to semantic graph data format
 */
export function analysisToSemanticData(analysis: TweetAnalysisResult): TwitterAnalysisData {
  return {
    capabilities: analysis.capabilities,
    needs: analysis.needs.map(n => ({
      name: n.name,
      urgency: n.urgency,
      context: n.context,
    })),
    opportunities: analysis.opportunities,
    topics: analysis.topics.map(t => t.topic),
  };
}
