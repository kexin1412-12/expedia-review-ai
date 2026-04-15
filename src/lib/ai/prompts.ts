import { GapCandidate, PropertyContext, ReviewTopic } from "@/types/ai";

export function buildGapDetectionPrompt(params: {
  property: PropertyContext;
  currentReviewText: string;
  coveredTopics: ReviewTopic[];
  candidates: GapCandidate[];
}) {
  const { property, currentReviewText, coveredTopics, candidates } = params;

  return `
You are an AI assistant helping improve hotel review quality.

Your task is to identify the single most useful follow-up topic for a hotel review.

You are given:
1. Property context
2. Candidate topic gaps derived from structured review coverage signals
3. The user's current review draft
4. Topics already detected as covered in the current draft

IMPORTANT:
You must first determine which candidate topics are already explicitly or implicitly mentioned in the user's draft.

A topic counts as already mentioned if the user:
- gives an opinion about it
- describes an experience with it
- complains about it
- praises it
- implies they used it

Examples:
- "the parking is not good" => parking is already covered
- "wifi was slow" => wifi is already covered
- "breakfast had limited options" => breakfast is already covered

Your job:
Step 1: Identify which candidate topics are already covered in the user's draft
Step 2: Exclude those topics completely
Step 3: From the remaining candidates, choose ONE topic that is under-covered, stale, or valuable for future guests
Step 4: If no good topic remains, return null

STRICT RULES:
- NEVER select a topic that is already covered in the user's current review
- Treat explicit opinions as coverage
- Prefer missing or stale topics over well-covered ones
- Return valid JSON only
- Be concise

Property context:
${JSON.stringify(property, null, 2)}

Current review draft:
"${currentReviewText}"

Pre-detected covered topics:
${JSON.stringify(coveredTopics)}

Candidate topic gaps:
${JSON.stringify(candidates, null, 2)}

Return ONLY JSON:
{
  "selected_topic": "breakfast",
  "reason": "Breakfast is not covered in the user's review and has low recent coverage.",
  "confidence": 0.86,
  "excluded_topics": ["parking"]
}
`;
}

export function buildFollowUpPrompt(params: {
  selectedTopic: ReviewTopic;
  reason: string;
  currentReviewText: string;
  mentionDepth: "not_mentioned" | "shallow" | "detailed";
  mode: "basic_question" | "clarify_question" | "none";
}) {
  const { selectedTopic, reason, currentReviewText, mentionDepth, mode } = params;

  return `
You are generating one personalized follow-up question for a hotel review flow.

Context:
- Selected topic: ${selectedTopic}
- Reason this topic was chosen: ${reason}
- User's current review: "${currentReviewText}"
- Mention depth for this topic: ${mentionDepth}
- Required mode: ${mode}

STRICT RULES:

1. If mode = "none"
Return exactly:
{ "question": null, "quick_replies": [] }

2. If mode = "basic_question"
- The topic has NOT been mentioned yet
- Ask a natural first-time question
- Keep it short and easy to answer
- NEVER start with "Did you try", "Did you use", "Did you notice"

3. If mode = "clarify_question"
- The user has ALREADY mentioned this topic
- You MUST NOT ask:
  - "Did you try..."
  - "Did you use..."
  - "Did you notice..."
  - any yes/no confirmation question
- Ask for a specific detail instead

4. If the user already expressed an opinion, assume they experienced the topic

5. Maximum 14 words
6. Return valid JSON only

7. Quick replies rules:
- Generate exactly 4 quick reply options
- Each reply must be specific and descriptive (NOT generic words like "Great", "Okay", "Poor")
- Replies should reflect realistic guest experiences for the topic
- Replies should be 2-5 words each

GOOD EXAMPLES:
User: "the breakfast is not good"
Topic: breakfast
Mode: clarify_question
Return:
{
  "question": "What specifically was not good about the breakfast?",
  "quick_replies": ["Limited options", "Cold food", "Poor quality", "Long wait"]
}

User: "nice hotel"
Topic: breakfast
Mode: basic_question
Return:
{
  "question": "How was the breakfast during your stay?",
  "quick_replies": ["Fresh and varied", "Basic but okay", "Not worth it", "Didn't have it"]
}

User: "the wifi was slow and kept disconnecting"
Topic: wifi
Mode: none
Return:
{
  "question": null,
  "quick_replies": []
}

Return ONLY JSON:
{
  "question": "...",
  "quick_replies": ["...", "...", "...", "..."]
}
`;
}

export function buildInsightPrompt(params: {
  topic: ReviewTopic;
  answer: string;
}) {
  const { topic, answer } = params;

  return `
You are extracting structured insight from a short hotel review follow-up answer.

Input:
- Topic: ${topic}
- User answer: ${answer}

Task:
Extract:
- sentiment: one of positive, neutral, negative, mixed
- insight: a short phrase no longer than 10 words

Rules:
- Return valid JSON only
- No explanation text

Return ONLY JSON:
{
  "sentiment": "mixed",
  "insight": "Good quality but limited options"
}
`;
}
