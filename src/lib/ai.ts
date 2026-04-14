import { ProxyAgent, fetch } from "undici";
import { HotelRecord, ReviewRecord } from "@/types";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;

async function createResponse(input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input,
    }),
    dispatcher: proxyDispatcher ?? undefined,
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }

  return (await response.json()) as OpenAIResponse;
}

function getResponseText(response: OpenAIResponse) {
  if (response.output_text?.trim()) {
    return response.output_text.trim();
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseJsonText(text: string) {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(normalized);
}

function topAmenities(hotel: HotelRecord) {
  return hotel.amenities.slice(0, 5).join(", ");
}

function fallbackSummary(hotel: HotelRecord) {
  const location = hotel.city ?? hotel.country ?? "the property";
  const amenities = topAmenities(hotel) || "its convenient stay experience";

  return {
    summary: `Guests often mention ${location} for ${amenities}.`,
    highlights: [
      "Use recent guest comments to keep property details current.",
      "Show one concise follow-up while the traveler is already writing.",
      "Keep the experience quick, optional, and easy to complete.",
    ],
    pros: [
      `Convenient base in ${location}`,
      `Noted amenities include ${hotel.amenities.slice(0, 2).join(" and ") || "core stay basics"}`,
      "Guest feedback is easy to scan before booking",
    ],
    cons: [
      "Some details still depend on fuller guest feedback",
      "Property-specific tradeoffs may vary by room type",
      "Recent operational changes may not be fully reflected yet",
    ],
    sentiment: {
      positive: ["Location", "Convenience", hotel.amenities[0] ?? "Comfort"],
      mixed: [hotel.amenities[1] ?? "Dining", "Value"],
      negative: ["Limited detail in fallback mode"],
    },
  };
}

export async function generateHotelSummary(hotel: HotelRecord, reviews: ReviewRecord[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  const sampleReviews = reviews.slice(0, 12).map((review) => review.text).filter(Boolean);

  if (!apiKey || sampleReviews.length === 0) {
    return fallbackSummary(hotel);
  }

  const prompt = `You are helping power a hotel review experience inside Expedia.
Summarize what guests are saying about this property in a product-friendly way.

Hotel:\n${JSON.stringify(hotel, null, 2)}

Recent guest comments:\n${sampleReviews.join("\n---\n")}

Return valid JSON only in this format:
{
  "summary": "1-2 sentence summary",
  "highlights": ["short highlight", "short highlight", "short highlight"],
  "pros": ["short pro", "short pro", "short pro"],
  "cons": ["short con", "short con", "short con"],
  "sentiment": {
    "positive": ["topic", "topic", "topic"],
    "mixed": ["topic", "topic"],
    "negative": ["topic", "topic"]
  }
}`;

  try {
    const response = await createResponse(prompt);
    return parseJsonText(getResponseText(response ?? {}));
  } catch (error) {
    console.error("Failed to generate hotel summary", error);
    return fallbackSummary(hotel);
  }
}

export async function generateFollowUp(hotel: HotelRecord, reviews: ReviewRecord[], draftReview: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const sampleReviews = reviews.slice(0, 18).map((review) => review.text).filter(Boolean);

  const fallback = {
    topic: "breakfast",
    question: "Did you try the breakfast during your stay?",
    rationale: "Breakfast is useful for future guests and is not yet covered in your review.",
    quickReplies: ["Great", "Okay", "Poor", "Didn't try it"],
  };

  if (!apiKey || sampleReviews.length === 0) {
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
    const response = await createResponse(prompt);
    const parsed = parseJsonText(getResponseText(response ?? {}));
    if (!parsed.question || !Array.isArray(parsed.quickReplies)) return fallback;
    return parsed;
  } catch (error) {
    console.error("Failed to generate follow-up", error);
    return fallback;
  }
}
