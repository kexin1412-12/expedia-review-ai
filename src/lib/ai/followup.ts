import { FollowUpOutput, ReviewTopic } from "@/types/ai";
import { buildFollowUpPrompt } from "@/lib/ai/prompts";
import { getOpenAIClient } from "@/lib/ai/openai";

export type MentionDepth = "not_mentioned" | "shallow" | "detailed";
export type FollowupMode = "basic_question" | "clarify_question" | "none";

const TOPIC_KEYWORDS: Record<string, string[]> = {
  breakfast: ["breakfast", "buffet", "morning meal"],
  wifi: ["wifi", "wi-fi", "internet"],
  service: ["staff", "service", "front desk", "reception"],
  cleanliness: ["clean", "dirty", "cleanliness", "hygiene"],
  check_in: ["check-in", "check in", "checking in"],
  check_out: ["check-out", "check out", "checking out"],
  pool: ["pool", "swimming"],
  parking: ["parking", "garage", "valet"],
  noise: ["noise", "noisy", "quiet", "loud"],
  location: ["location", "neighborhood", "area", "near", "nearby"],
  room_condition: ["room", "bed", "bathroom", "shower", "towel"],
  amenities: ["amenities", "gym", "fitness", "spa", "sauna"],
  family_friendly: ["family", "kids", "children"],
  pet_friendly: ["pet", "dog", "cat"],
  safety: ["safe", "safety", "secure", "security"],
};

const DETAIL_HINTS = [
  "because", "but", "limited", "cold", "slow", "dirty", "friendly",
  "rude", "crowded", "late", "long", "options", "variety", "price",
  "quality", "taste", "wait", "line", "smell", "hot", "warm", "broken",
  "small", "comfortable", "uncomfortable", "excellent", "terrible",
  "awful", "amazing", "disgusting", "outdated", "renovated", "spacious",
  "tiny", "stale", "fresh", "expensive", "cheap", "overpriced",
  "disappointing", "disconnecting", "dropped", "unreliable",
  "good", "bad", "poor", "great", "not",
];

export function detectTopicMentionDepth(
  reviewText: string,
  topic: string,
): MentionDepth {
  const lower = reviewText.toLowerCase().trim();
  const keywords = TOPIC_KEYWORDS[topic] || [topic.replace(/_/g, " ")];

  const mentioned = keywords.some((kw) => lower.includes(kw));
  if (!mentioned) return "not_mentioned";

  const sentences = lower.split(/[.!?\n]+/).filter((s) => s.trim());
  const relevantSentences = sentences.filter((s) =>
    keywords.some((kw) => s.includes(kw)),
  );
  const relevantText = relevantSentences.join(" ");
  const wordCount = relevantText.split(/\s+/).filter(Boolean).length;
  const hasDetailHint = DETAIL_HINTS.some((hint) => relevantText.includes(hint));

  if (hasDetailHint || wordCount > 8) return "detailed";
  return "shallow";
}

export function decideFollowupMode(mentionDepth: MentionDepth): FollowupMode {
  switch (mentionDepth) {
    case "not_mentioned": return "basic_question";
    case "shallow": return "clarify_question";
    case "detailed": return "none";
    default: return "basic_question";
  }
}

const DEFAULT_QUICK_REPLIES: Record<ReviewTopic, string[]> = {
  cleanliness: ["Spotless everywhere", "Room clean, common areas less so", "Needed attention", "Visible issues"],
  service: ["Friendly and attentive", "Professional but distant", "Slow response times", "Hard to find staff"],
  breakfast: ["Loved the variety", "Basic but fine", "Limited options", "Skipped it"],
  pool: ["Clean and relaxing", "Crowded but okay", "Needs maintenance", "Was closed"],
  parking: ["Easy and free", "Tight but manageable", "Expensive valet only", "Hard to find spots"],
  location: ["Walking distance to everything", "Short drive needed", "Far from attractions", "Great for quiet retreat"],
  noise: ["Dead silent", "Some hallway noise", "Street noise all night", "Heard neighbors clearly"],
  amenities: ["Well-equipped gym", "Nice common areas", "Outdated facilities", "Nothing stood out"],
  check_in: ["Fast and seamless", "Long wait in line", "Friendly but slow", "Had a booking issue"],
  check_out: ["Quick and easy", "Had to wait", "Billing confusion", "Express checkout worked"],
  room_condition: ["Modern and fresh", "Comfortable but dated", "Needs renovation", "Minor wear and tear"],
  wifi: ["Fast and stable", "Worked in lobby only", "Kept disconnecting", "Too slow to use"],
  family_friendly: ["Kids loved it", "Some kid options", "Not ideal for kids", "Adults-only vibe"],
  pet_friendly: ["Pet area available", "Allowed but limited", "Extra fees applied", "Not accommodating"],
  safety: ["Well-lit and secure", "Security guards present", "Felt uneasy at night", "Poorly lit areas"],
};

const DEFAULT_QUESTIONS: Record<ReviewTopic, string> = {
  cleanliness: "How would you describe the overall cleanliness?",
  service: "What stood out most about the staff?",
  breakfast: "What was the breakfast experience like?",
  pool: "How was the pool area during your visit?",
  parking: "What was the parking situation like?",
  location: "How did the location work for your plans?",
  noise: "How was the noise level in your room?",
  amenities: "Which amenities made the biggest impression?",
  check_in: "What was the check-in process like?",
  check_out: "What was the check-out process like?",
  room_condition: "How would you describe the room condition?",
  wifi: "How was the Wi-Fi speed and reliability?",
  family_friendly: "How well did the property work for families?",
  pet_friendly: "How accommodating was the property for pets?",
  safety: "How secure did the property feel?",
};

export async function generateFollowUpQuestion(params: {
  selectedTopic: ReviewTopic;
  reason: string;
  currentReviewText: string;
}): Promise<FollowUpOutput | null> {
  const { selectedTopic, reason, currentReviewText } = params;

  // ── Detect mention depth and mode ──
  const mentionDepth = detectTopicMentionDepth(currentReviewText, selectedTopic);
  const mode = decideFollowupMode(mentionDepth);

  // Short-circuit: topic already covered in detail
  if (mode === "none") {
    return null;
  }

  const client = getOpenAIClient();
  const prompt = buildFollowUpPrompt({
    selectedTopic,
    reason,
    currentReviewText,
    mentionDepth,
    mode,
  });

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text?.trim() ?? "";
    const parsed = JSON.parse(raw) as FollowUpOutput;

    // If LLM returned null question (mode=none), skip
    if (!parsed.question) return null;

    return {
      question: parsed.question || DEFAULT_QUESTIONS[selectedTopic],
      quick_replies:
        Array.isArray(parsed.quick_replies) && parsed.quick_replies.length > 0
          ? parsed.quick_replies
          : DEFAULT_QUICK_REPLIES[selectedTopic],
    };
  } catch {
    return {
      question: DEFAULT_QUESTIONS[selectedTopic],
      quick_replies: DEFAULT_QUICK_REPLIES[selectedTopic],
    };
  }
}
