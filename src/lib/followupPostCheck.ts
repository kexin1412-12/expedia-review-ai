import { MentionDepth } from "./followupGuards";

const REDUNDANT_PREFIXES = [
  "did you try",
  "did you use",
  "have you tried",
  "have you used",
  "did you experience",
  "did you notice",
  "were you able to",
];

const CLARIFY_FALLBACKS: Record<string, string> = {
  breakfast: "What specifically was not good about the breakfast?",
  wifi: "What issues did you experience with the Wi-Fi?",
  service: "What about the service stood out to you?",
  cleanliness: "What cleanliness issues did you notice?",
  check_in: "What was the check-in experience like?",
  check_out: "What could have been better about check-out?",
  pool: "What about the pool could be improved?",
  parking: "What was your experience with parking?",
  noise: "What kind of noise issues did you notice?",
  room_condition: "What about the room condition stood out?",
};

export function postCheckFollowup(
  question: string,
  topic: string,
  mentionDepth: MentionDepth,
): string | null {
  // Only guard against redundant yes/no when user already mentioned the topic
  if (mentionDepth === "not_mentioned") return question;

  const lower = question.toLowerCase().trim();

  const isRedundant = REDUNDANT_PREFIXES.some((prefix) =>
    lower.startsWith(prefix),
  );

  if (isRedundant) {
    // Swap in a safe clarifying fallback
    return CLARIFY_FALLBACKS[topic] || null;
  }

  return question;
}
