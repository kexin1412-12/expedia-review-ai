/**
 * Clean hotels.json:
 * 1. Remove all |MASK| tokens with contextual replacements
 * 2. Capitalize first letter of every sentence
 * 3. Strip HTML tags
 * 4. Translate any non-English text to English
 *
 * Usage: node scripts/clean-hotels.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { translate } from "bing-translate-api";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const hotelsPath = join(ROOT, "src/data/hotels.json");
const backupPath = join(ROOT, "src/data/hotels.backup.json");

// Backup
copyFileSync(hotelsPath, backupPath);
console.log("Backup saved.\n");

const hotels = JSON.parse(readFileSync(hotelsPath, "utf-8"));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let maskCount = 0;
let translateCount = 0;
let capitalizeCount = 0;

/* ── Helpers ── */

/** Remove |MASK| with contextual replacement */
function removeMask(text, hotelName) {
  if (!text.includes("|MASK|")) return text;
  maskCount++;
  let t = text;
  // "contact |MASK| property" → "contact the property"
  t = t.replace(/\|MASK\|\s*property/gi, "the property");
  // "|MASK| information on |MASK| booking" → "the information on your booking"
  t = t.replace(/\|MASK\|\s*information\s+on\s+\|MASK\|\s*booking/gi, "the information on your booking");
  // "|MASK| booking confirmation" → "your booking confirmation"
  t = t.replace(/\|MASK\|\s*booking/gi, "your booking");
  // "hotel |MASK|" → "the hotel"
  t = t.replace(/hotel\s+\|MASK\|/gi, "the hotel");
  // "|MASK| hotel" → "the hotel"
  t = t.replace(/\|MASK\|\s+hotel/gi, "the hotel");
  // "at |MASK|" → "at the property"
  t = t.replace(/at\s+\|MASK\|/gi, "at the property");
  // "by |MASK|" → "by the property"
  t = t.replace(/by\s+\|MASK\|/gi, "by the property");
  // "from |MASK|" → "from the property"
  t = t.replace(/from\s+\|MASK\|/gi, "from the property");
  // "to |MASK|" → "to the property"
  t = t.replace(/to\s+\|MASK\|/gi, "to the property");
  // "of |MASK|" → "of the property"
  t = t.replace(/of\s+\|MASK\|/gi, "of the property");
  // "in |MASK|" → "in the area" (for area descriptions)
  t = t.replace(/in\s+\|MASK\|,/gi, "in the area,");
  t = t.replace(/in\s+\|MASK\|\./gi, "in the area.");
  // Generic remaining |MASK| → "the property"
  t = t.replace(/\|MASK\|/g, "the property");
  // Clean up spacing
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/** Strip HTML tags */
function stripHtml(text) {
  return text.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Capitalize first letter of each sentence */
function capitalize(text) {
  if (!text || text.length === 0) return text;
  let changed = false;
  // Capitalize first character
  let result = text.replace(/^\s*([a-z])/, (_, c) => { changed = true; return c.toUpperCase(); });
  // Capitalize after sentence-ending punctuation
  result = result.replace(/([.!?;])\s+([a-z])/g, (_, p, c) => { changed = true; return `${p} ${c.toUpperCase()}`; });
  if (changed) capitalizeCount++;
  return result;
}

/** Check if text is likely non-English (for sentences, not short phrases) */
const COMMON_EN = new Set([
  "the","is","was","and","a","to","of","in","for","it","we","i","this","that",
  "with","on","at","but","very","not","are","have","had","our","my","from","be",
  "an","been","all","so","no","as","if","were","they","their","there","would",
  "could","hotel","room","staff","clean","good","great","nice","stay","location",
  "free","available","or","by","will","can","more","may","please","property",
  "guests","check","before","after","per","fee","contact","provided","using",
  "do","has","its","you","your","one","which","up","out","about","booking",
]);

function isLikelyNonEnglish(text) {
  if (!text || text.length < 10) return false;
  // Non-ASCII letters are a strong signal (but skip currency symbols, dashes, etc.)
  const letterOnly = text.replace(/[^a-zA-Z\u00C0-\u024F\u0400-\u04FF\u3000-\u9FFF\uAC00-\uD7AF]/g, "");
  const nonAsciiLetters = letterOnly.replace(/[a-zA-Z]/g, "");
  // If >30% non-ASCII letters, likely non-English
  if (nonAsciiLetters.length / (letterOnly.length || 1) > 0.3) return true;

  const words = text.toLowerCase().replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  let enHits = 0;
  for (const w of words) { if (COMMON_EN.has(w)) enHits++; }
  return enHits / words.length < 0.12;
}

/* ── Process each string recursively ── */
async function cleanString(text, hotelName) {
  let t = text;
  t = stripHtml(t);
  t = removeMask(t, hotelName);
  t = capitalize(t);

  // Check for non-English
  if (isLikelyNonEnglish(t)) {
    try {
      const res = await translate(t, null, "en");
      if (res.language?.from && res.language.from !== "en") {
        t = capitalize(res.translation);
        translateCount++;
        console.log(`  [${res.language.from}] → ${t.substring(0, 80)}`);
        await delay(400);
      }
    } catch (err) {
      console.warn(`  ✗ translate failed: ${err.message}`);
    }
  }
  return t;
}

async function cleanValue(value, hotelName) {
  if (typeof value === "string") {
    return cleanString(value, hotelName);
  }
  if (Array.isArray(value)) {
    const result = [];
    for (const item of value) {
      result.push(await cleanValue(item, hotelName));
    }
    return result;
  }
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      // Skip non-text fields
      if (["id", "rating", "starRating", "reviewCount"].includes(key)) {
        result[key] = val;
      } else {
        result[key] = await cleanValue(val, hotelName);
      }
    }
    return result;
  }
  return value;
}

/* ── Main ── */
for (let i = 0; i < hotels.length; i++) {
  const hotel = hotels[i];
  console.log(`\n${hotel.name}:`);
  hotels[i] = await cleanValue(hotel, hotel.name);
  // Preserve numeric/null fields
  hotels[i].rating = hotel.rating;
  hotels[i].starRating = hotel.starRating;
  hotels[i].reviewCount = hotel.reviewCount;
}

writeFileSync(hotelsPath, JSON.stringify(hotels, null, 2), "utf-8");
console.log(`\n✓ Done!`);
console.log(`  |MASK| cleaned: ${maskCount}`);
console.log(`  Translated: ${translateCount}`);
console.log(`  Capitalized: ${capitalizeCount}`);
