import { MentionDepth } from "./followupGuards";

export type FollowupMode = "basic_question" | "clarify_question" | "none";

export function decideFollowupMode(mentionDepth: MentionDepth): FollowupMode {
  switch (mentionDepth) {
    case "not_mentioned":
      return "basic_question";
    case "shallow":
      return "clarify_question";
    case "detailed":
      return "none";
    default:
      return "basic_question";
  }
}
