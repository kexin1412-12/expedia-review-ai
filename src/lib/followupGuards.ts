export type MentionDepth = "not_mentioned" | "shallow" | "detailed";

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
};

const DETAIL_HINTS = [
  "because",
  "but",
  "limited",
  "cold",
  "slow",
  "dirty",
  "friendly",
  "rude",
  "crowded",
  "late",
  "long",
  "options",
  "variety",
  "price",
  "quality",
  "taste",
  "wait",
  "line",
  "smell",
  "hot",
  "warm",
  "broken",
  "small",
  "comfortable",
  "uncomfortable",
  "excellent",
  "terrible",
  "awful",
  "amazing",
  "disgusting",
  "outdated",
  "renovated",
  "spacious",
  "tiny",
  "stale",
  "fresh",
  "expensive",
  "cheap",
  "overpriced",
  "disappointing",
  "disconnecting",
  "dropped",
  "unreliable",
];

export function detectTopicMention(
  draft: string,
  topic: string,
): MentionDepth {
  const lower = draft.toLowerCase().trim();
  const keywords = TOPIC_KEYWORDS[topic] || [topic.replace(/_/g, " ")];

  const mentioned = keywords.some((kw) => lower.includes(kw));
  if (!mentioned) return "not_mentioned";

  // Find the sentence(s) containing the keyword to measure depth locally
  const sentences = lower.split(/[.!?\n]+/).filter((s) => s.trim());
  const relevantSentences = sentences.filter((s) =>
    keywords.some((kw) => s.includes(kw)),
  );
  const relevantText = relevantSentences.join(" ");
  const wordCount = relevantText.split(/\s+/).filter(Boolean).length;

  const hasDetailHint = DETAIL_HINTS.some((hint) => relevantText.includes(hint));

  if (hasDetailHint || wordCount > 8) {
    return "detailed";
  }

  return "shallow";
}
