import OpenAI from "openai";
import { HotelRecord, ReviewRecord, FollowUpResponse } from "@/types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function topAmenities(hotel: HotelRecord) {
  return hotel.amenities.slice(0, 5).join(", ");
}

export async function generateHotelSummary(hotel: HotelRecord, reviews: ReviewRecord[]) {
  const client = getClient();
  const sampleReviews = reviews.slice(0, 12).map((review) => review.text).filter(Boolean);

  if (!client || sampleReviews.length === 0) {
    return {
      summary: `Guests often mention ${hotel.city ?? "the property"} for ${topAmenities(hotel) || "its convenient stay experience"}.`,
      highlights: [
        "Use recent guest comments to keep property details current.",
        "Show one concise follow-up while the traveler is already writing.",
        "Keep the experience quick, optional, and easy to complete.",
      ],
    };
  }

  const prompt = `You are helping power a hotel review experience inside Expedia.
Summarize what guests are saying about this property in a product-friendly way.

Hotel:\n${JSON.stringify(hotel, null, 2)}

Recent guest comments:\n${sampleReviews.join("\n---\n")}

Return valid JSON only in this format:
{
  "summary": "1-2 sentence summary",
  "highlights": ["short highlight", "short highlight", "short highlight"]
}`;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
    return JSON.parse(response.output_text);
  } catch {
    return {
      summary: `Guests often mention ${hotel.city ?? "the property"} for ${topAmenities(hotel) || "its convenient stay experience"}.`,
      highlights: [
        "Use recent guest comments to keep property details current.",
        "Show one concise follow-up while the traveler is already writing.",
        "Keep the experience quick, optional, and easy to complete.",
      ],
    };
  }
}

export async function generateFollowUp(hotel: HotelRecord, reviews: ReviewRecord[], draftReview: string) {
  const client = getClient();
  const sampleReviews = reviews.slice(0, 18).map((review) => review.text).filter(Boolean);

  const fallback = {
    topic: "breakfast",
    question: "Did you try the breakfast during your stay?",
    rationale: "Breakfast is useful for future guests and is not yet covered in your review.",
    quickReplies: ["Great", "Okay", "Poor", "Didn't try it"],
  };

  if (!client || sampleReviews.length === 0) {
    return fallback;
  }

  const prompt = `You are generating one low-friction follow-up question for a hotel review flow.

Goal:
- Ask exactly one short follow-up question.
- Base it on this hotel's existing guest comments.
- Avoid repeating topics the current draft review already covers.
- Make the question easy to answer by tap, short text, or voice.
- Keep it natural and product-friendly.

Hotel:\n${JSON.stringify(hotel, null, 2)}

Recent guest comments:\n${sampleReviews.join("\n---\n")}

Current draft review:\n${draftReview}

Return valid JSON only in this format:
{
  "topic": "one short topic label",
  "question": "single short question",
  "rationale": "one sentence rationale",
  "quickReplies": ["option 1", "option 2", "option 3", "option 4"]
}`;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
    const parsed = JSON.parse(response.output_text);
    if (!parsed.question || !Array.isArray(parsed.quickReplies)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

/* ────────────────────────────────────────
   Knowledge Health – dynamic follow-ups
   ──────────────────────────────────────── */

export interface GapSignal {
  dimension: string;
  coverage: string;
  mentionCount: number;
  recentMentionCount: number;
  avgScore: number | null;
}

interface HealthAIResult {
  followUps: FollowUpResponse[];
  dimensionQuestions: { dimension: string; questions: string[] }[];
}

export async function generateHealthFollowUps(
  hotel: HotelRecord,
  reviews: ReviewRecord[],
  gapSignals: GapSignal[],
): Promise<HealthAIResult> {
  const client = getClient();
  const sampleReviews = reviews
    .slice(0, 20)
    .map((r) => r.text)
    .filter(Boolean);

  const fallbackResult: HealthAIResult = {
    followUps: gapSignals.slice(0, 2).map((g) => ({
      topic: g.dimension,
      question: `How was the ${g.dimension.toLowerCase()} during your stay?`,
      rationale: `${g.dimension} has ${g.coverage.toLowerCase()} in recent reviews.`,
      quickReplies: ["Great", "Good", "Fair", "Poor"],
    })),
    dimensionQuestions: gapSignals.map((g) => ({
      dimension: g.dimension,
      questions: [`How was the ${g.dimension.toLowerCase()}?`],
    })),
  };

  if (!client || sampleReviews.length === 0) {
    return fallbackResult;
  }

  const prompt = `You are an Expedia product analyst identifying knowledge gaps in hotel reviews.

Context:
- Property: ${hotel.name} in ${hotel.city ?? "unknown city"}
- Description: ${hotel.description}
- Amenities: ${hotel.amenities.join(", ")}

Gap signals detected (dimensions needing more coverage):
${JSON.stringify(gapSignals, null, 2)}

Sample recent reviews:
${sampleReviews.join("\n---\n")}

Tasks:
1. Generate 1-2 dynamic follow-up questions targeting the most important gaps. Each should be low-friction and easy for a guest to answer.
2. For each gap dimension, suggest 1-2 specific question candidates that could be asked.

Return valid JSON only in this format:
{
  "followUps": [
    {
      "topic": "dimension label",
      "question": "short question text",
      "rationale": "one sentence rationale",
      "quickReplies": ["option1", "option2", "option3", "option4"]
    }
  ],
  "dimensionQuestions": [
    {
      "dimension": "exact dimension label from input",
      "questions": ["question 1", "question 2"]
    }
  ]
}`;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
    const parsed = JSON.parse(response.output_text);
    if (!Array.isArray(parsed.followUps) || !Array.isArray(parsed.dimensionQuestions)) {
      return fallbackResult;
    }
    return parsed;
  } catch {
    return fallbackResult;
  }
}
