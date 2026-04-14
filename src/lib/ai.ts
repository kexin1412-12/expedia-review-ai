import OpenAI from "openai";
import { HotelRecord, ReviewRecord, FollowUpResponse, DimensionHealth, SuggestedQuestion, DimensionKey } from "@/types";

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
   Knowledge Health – AI refinement
   ──────────────────────────────────────── */

const DIMENSION_KEYS: DimensionKey[] = [
  "cleanliness", "service", "check_in", "breakfast",
  "pool", "parking", "noise", "wifi",
];

interface RefineHealthInput {
  hotel: HotelRecord;
  reviews: ReviewRecord[];
  cards: DimensionHealth[];
  fallbackQuestions: SuggestedQuestion[];
  maxQuestions: number;
}

interface RefineHealthResult {
  questions: SuggestedQuestion[];
  aiSummary: string;
}

export async function refineHealthWithAI(params: RefineHealthInput): Promise<RefineHealthResult> {
  const { hotel, reviews, cards, fallbackQuestions, maxQuestions } = params;
  const client = getClient();

  const fallbackResult: RefineHealthResult = {
    questions: fallbackQuestions,
    aiSummary: "AI refinement skipped because OPENAI_API_KEY is not configured.",
  };

  if (!client) return fallbackResult;

  const condensedReviews = reviews.slice(0, 40).map((r) => ({
    date: r.date,
    title: (r.title ?? "").slice(0, 120),
    text: (r.text ?? "").slice(0, 280),
  }));

  const promptPayload = {
    property: {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      province: hotel.province,
      country: hotel.country,
      starRating: hotel.starRating,
      description: hotel.description.slice(0, 500),
      areaDescription: hotel.areaDescription.slice(0, 300),
      amenities: hotel.amenities,
    },
    healthCards: cards,
    fallbackQuestions,
    recentReviews: condensedReviews,
    task: {
      goal: "Select the best 1-2 low-friction follow-up questions that fill missing or stale property information.",
      constraints: [
        "Ask at most the requested number of questions.",
        "Prefer dimensions that are stale, unknown, risky, or important for future travelers.",
        "Keep questions conversational, specific, and easy to answer.",
      ],
      maxQuestions,
    },
  };

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "You are an Expedia review intelligence assistant. Choose the best follow-up questions to refresh missing or outdated property knowledge. Return only structured JSON.",
        },
        {
          role: "user",
          content: JSON.stringify(promptPayload),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "review_gap_questions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              aiSummary: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    dimension: { type: "string", enum: DIMENSION_KEYS },
                    question: { type: "string" },
                    why: { type: "string" },
                    answerType: { type: "string", enum: ["text", "yes_no", "choice"] },
                    priority: { type: "number" },
                  },
                  required: ["dimension", "question", "why", "answerType", "priority"],
                },
              },
            },
            required: ["aiSummary", "questions"],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as RefineHealthResult;
    if (!Array.isArray(parsed.questions)) return fallbackResult;
    return parsed;
  } catch {
    return fallbackResult;
  }
}
