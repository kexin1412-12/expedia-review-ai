import OpenAI from "openai";
import { HotelRecord, ReviewRecord } from "@/types";

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
