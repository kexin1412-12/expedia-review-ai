import {
  GapCandidate,
  GapDetectionOutput,
  PropertyContext,
  ReviewRecord,
  ReviewTopic,
  TopicCoverageStats,
} from "@/types/ai";
import { ALL_TOPICS, extractTopicsFromText } from "@/lib/ai/topics";
import { buildGapDetectionPrompt } from "@/lib/ai/prompts";
import { getOpenAIClient } from "@/lib/ai/openai";

function daysBetween(a: Date, b: Date): number {
  const diff = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getWeightedRecencyScore(daysAgo: number): number {
  if (daysAgo <= 14) return 1.0;
  if (daysAgo <= 30) return 0.7;
  if (daysAgo <= 60) return 0.4;
  if (daysAgo <= 90) return 0.2;
  return 0;
}

function computeTopicStats(
  topic: ReviewTopic,
  reviews: ReviewRecord[],
  now: Date
): TopicCoverageStats {
  let mentionCountTotal = 0;
  let mentionCount30d = 0;
  let mentionCount90d = 0;
  let weighted = 0;
  let lastMentionDays: number | null = null;

  for (const review of reviews) {
    const text = `${review.review_title ?? ""} ${review.review_text ?? ""}`.trim();
    const topics = extractTopicsFromText(text);
    if (!topics.includes(topic)) continue;

    mentionCountTotal += 1;

    const reviewDate = new Date(review.acquisition_date);
    if (Number.isNaN(reviewDate.getTime())) continue;

    const daysAgo = daysBetween(now, reviewDate);

    if (daysAgo <= 30) mentionCount30d += 1;
    if (daysAgo <= 90) mentionCount90d += 1;

    weighted += getWeightedRecencyScore(daysAgo);

    if (lastMentionDays === null || daysAgo < lastMentionDays) {
      lastMentionDays = daysAgo;
    }
  }

  const recentReviewCount = reviews.filter((r) => {
    const d = new Date(r.acquisition_date);
    if (Number.isNaN(d.getTime())) return false;
    return daysBetween(now, d) <= 90;
  }).length || 1;

  return {
    topic,
    mentionCountTotal,
    mentionCount30d,
    mentionCount90d,
    mentionRate90d: mentionCount90d / recentReviewCount,
    daysSinceLastMention: lastMentionDays,
    recentWeightedScore: weighted,
  };
}

function buildGapReason(stats: TopicCoverageStats): string {
  if (stats.mentionCount90d === 0) {
    return `${stats.topic} has not been mentioned in recent reviews.`;
  }
  if ((stats.daysSinceLastMention ?? 999) > 45) {
    return `${stats.topic} has not been refreshed recently.`;
  }
  if (stats.mentionRate90d < 0.08) {
    return `${stats.topic} has low recent review coverage.`;
  }
  return `${stats.topic} could use fresher guest input.`;
}

function scoreGap(stats: TopicCoverageStats): number {
  const missingScore = stats.mentionRate90d < 0.08 ? 0.45 : 0.15;
  const staleScore =
    stats.daysSinceLastMention === null
      ? 0.45
      : Math.min(stats.daysSinceLastMention / 90, 1) * 0.4;

  const lowCoverageScore = stats.recentWeightedScore < 1 ? 0.25 : 0.05;

  return Number((missingScore + staleScore + lowCoverageScore).toFixed(3));
}

function buildCandidates(
  reviews: ReviewRecord[],
  coveredTopics: ReviewTopic[],
  now: Date
): GapCandidate[] {
  return ALL_TOPICS
    .filter((topic) => !coveredTopics.includes(topic))
    .map((topic) => {
      const stats = computeTopicStats(topic, reviews, now);
      return {
        topic,
        priorityScore: scoreGap(stats),
        reason: buildGapReason(stats),
        stats,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export async function detectBestGap(params: {
  property: PropertyContext;
  reviews: ReviewRecord[];
  currentReviewText: string;
}): Promise<GapDetectionOutput> {
  const { property, reviews, currentReviewText } = params;
  const now = new Date();

  // ── Hard-filter: keyword-based topic extraction BEFORE LLM ──
  const coveredTopics = extractTopicsFromText(currentReviewText);

  // buildCandidates already excludes coveredTopics, but we do a second
  // explicit exclusion pass to guarantee no covered topic leaks through
  const rawCandidates = buildCandidates(reviews, coveredTopics, now);
  const candidates = rawCandidates
    .filter((c) => !coveredTopics.includes(c.topic))
    .slice(0, 5);

  if (candidates.length === 0) {
    return {
      selected_topic: null,
      reason: "No uncovered high-value topic remains.",
      confidence: 0.9,
      covered_topics: coveredTopics,
      candidates: [],
    };
  }

  const client = getOpenAIClient();
  const prompt = buildGapDetectionPrompt({
    property,
    currentReviewText,
    coveredTopics,
    candidates,
  });

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text?.trim() ?? "";
    const parsed = JSON.parse(raw) as {
      selected_topic: ReviewTopic | null;
      reason: string;
      confidence: number;
    };

    return {
      selected_topic: parsed.selected_topic,
      reason: parsed.reason,
      confidence: parsed.confidence,
      covered_topics: coveredTopics,
      candidates,
    };
  } catch {
    const fallback = candidates[0];
    return {
      selected_topic: fallback.topic,
      reason: fallback.reason,
      confidence: 0.65,
      covered_topics: coveredTopics,
      candidates,
    };
  }
}
