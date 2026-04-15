/**
 * Language utilities for Web Speech API and multi-language support
 */

/**
 * Maps friendly hotel language names to Web Speech API language codes (BCP 47)
 */
export function getWebSpeechLanguageCode(hotelLanguages?: string[]): string {
  if (!hotelLanguages || hotelLanguages.length === 0) {
    return getLanguageFromNavigator();
  }

  const hotelLangName = hotelLanguages[0];
  const languageMapping: Record<string, string> = {
    English: "en-US",
    Mandarin: "zh-CN",
    Chinese: "zh-CN",
    Spanish: "es-ES",
    French: "fr-FR",
    German: "de-DE",
    Japanese: "ja-JP",
    Korean: "ko-KR",
    Italian: "it-IT",
    Portuguese: "pt-BR",
    Russian: "ru-RU",
    Dutch: "nl-NL",
    Polish: "pl-PL",
    Swedish: "sv-SE",
    Danish: "da-DK",
    Norwegian: "nb-NO",
    Finnish: "fi-FI",
    Greek: "el-GR",
    Turkish: "tr-TR",
    Hebrew: "he-IL",
    Arabic: "ar-SA",
    Hindi: "hi-IN",
    Thai: "th-TH",
    Vietnamese: "vi-VN",
    Indonesian: "id-ID",
    Tagalog: "fil-PH",
  };

  return languageMapping[hotelLangName] || "en-US";
}

/**
 * Gets the browser's preferred language
 */
export function getLanguageFromNavigator(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-US";
}

/**
 * Checks if the browser supports Web Speech API
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

/**
 * Get the SpeechRecognition constructor
 */
export function getSpeechRecognitionConstructor(): any {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}
