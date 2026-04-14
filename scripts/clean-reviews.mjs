/**
 * Clean reviews WITHOUT any paid API:
 * 1. Remove |MASK| tokens (replace with hotel name or generic phrases)
 * 2. Translate non-English reviews to English via google-translate-api-x
 * 3. Standardize formatting: sentence case, trim whitespace, fix punctuation
 *
 * Usage: node scripts/clean-reviews.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { translate } from "bing-translate-api";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const hotelsPath = join(ROOT, "src/data/hotels.json");
const reviewsPath = join(ROOT, "src/data/reviews-by-hotel.json");

const hotels = JSON.parse(readFileSync(hotelsPath, "utf-8"));
const reviewsByHotel = JSON.parse(readFileSync(reviewsPath, "utf-8"));

const hotelMap = Object.fromEntries(hotels.map((h) => [h.id, h]));

/* ── helpers ── */

const COMMON_EN = new Set([
  "the", "is", "was", "and", "a", "to", "of", "in", "for", "it", "we", "i",
  "this", "that", "with", "on", "at", "but", "very", "not", "are", "have",
  "had", "our", "my", "from", "be", "an", "been", "all", "so", "no", "as",
  "if", "were", "they", "their", "there", "would", "could", "hotel", "room",
  "staff", "clean", "good", "great", "nice", "stay", "location", "just",
  "also", "breakfast", "one", "or", "which", "will", "can", "more", "out",
  "about", "than", "up", "only", "do", "did", "get", "has", "its", "you",
]);

/** Heuristic: is the text likely non-English? */
function isLikelyNonEnglish(text) {
  const words = text.toLowerCase().replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length < 4) return false; // too short to judge
  let enHits = 0;
  for (const w of words) {
    if (COMMON_EN.has(w)) enHits++;
  }
  return enHits / words.length < 0.15;
}

/** Replace |MASK| with contextual text */
function removeMasks(text, hotel) {
  if (!text.includes("|MASK|")) return text;

  const name = hotel?.name ?? "the hotel";
  let result = text;

  // Common patterns: "hotel |MASK|" → "hotel <name>"
  result = result.replace(/\bhotel\s+\|MASK\|/gi, `hotel ${name}`);
  // "|MASK| hotel" → "<name> hotel" or just the name
  result = result.replace(/\|MASK\|\s+hotel/gi, name);
  // "|MASK| ruins" → "the ruins"  (Pompeii context)
  result = result.replace(/\|MASK\|\s+ruins/gi, "the ruins");
  // "|MASK| scavi" → "Pompeii Scavi" (train station)
  result = result.replace(/\|MASK\|\s+scavi/gi, "Pompeii Scavi");
  // "ruins of |MASK|" / "scavi di |MASK|"
  result = result.replace(/ruins\s+of\s+\|MASK\|/gi, "ruins of Pompeii");
  result = result.replace(/scavi\s+di\s+\|MASK\|/gi, "scavi di Pompeii");
  // "from |MASK|" (often the hotel)
  result = result.replace(/from\s+\|MASK\|/gi, `from ${name}`);
  // "|MASK| describes itself" → "The hotel describes itself"
  result = result.replace(/\|MASK\|\s+describes/gi, "The hotel describes");
  // Generic remaining |MASK| → "the hotel" or hotel name
  result = result.replace(/\|MASK\|/g, name);

  // Clean up double spaces
  result = result.replace(/\s{2,}/g, " ").trim();
  return result;
}

/** Sentence-case: capitalize first letter of each sentence */
function sentenceCase(text) {
  return text
    .replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Standardize formatting */
function standardize(text) {
  let t = text;
  // Collapse excessive dots (..... → .)
  t = t.replace(/\.{2,}/g, ".");
  // Collapse excessive whitespace
  t = t.replace(/\s{2,}/g, " ");
  // Fix space before punctuation
  t = t.replace(/\s+([.,!?;:])/g, "$1");
  // Ensure space after punctuation (except inside numbers like 5.0)
  t = t.replace(/([.,!?;:])(?=[A-Za-z])/g, "$1 ");
  // Trim
  t = t.trim();
  // Sentence case
  t = sentenceCase(t);
  // Ensure ends with punctuation
  if (t.length > 0 && !/[.!?]$/.test(t)) {
    t += ".";
  }
  return t;
}

/** Delay helper */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Translate a single text to English with retry */
async function translateToEnglish(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await translate(text, null, "en");
      return res.translation;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`      ↻ translate retry ${attempt}/${retries}: ${err.message}`);
        await delay(2000 * attempt);
      } else {
        throw err;
      }
    }
  }
}

/* ── main ── */
async function main() {
  // Backup original
  const backupPath = reviewsPath.replace(".json", ".backup.json");
  copyFileSync(reviewsPath, backupPath);
  console.log(`Backup saved to ${backupPath}\n`);

  const hotelIds = Object.keys(reviewsByHotel);
  let totalReviews = 0;
  let maskedCount = 0;
  let translatedCount = 0;

  for (const id of hotelIds) totalReviews += reviewsByHotel[id].length;
  console.log(`Processing ${totalReviews} reviews across ${hotelIds.length} hotels...\n`);

  let processed = 0;

  for (const hotelId of hotelIds) {
    const hotel = hotelMap[hotelId];
    const reviews = reviewsByHotel[hotelId];
    const hotelName = hotel?.name ?? hotelId.substring(0, 8);

    console.log(`  ${hotelName} (${reviews.length} reviews)`);

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      if (!r.text || r.text.trim().length === 0) {
        processed++;
        continue;
      }

      // Step 1: Remove |MASK|
      const hadMask = r.text.includes("|MASK|");
      r.text = removeMasks(r.text, hotel);
      if (hadMask) maskedCount++;

      // Step 2: Translate non-English
      if (isLikelyNonEnglish(r.text)) {
        try {
          const translated = await translateToEnglish(r.text);
          r.text = translated;
          translatedCount++;
          process.stdout.write(`    ✓ translated review ${i + 1}\n`);
          await delay(500); // rate-limit
        } catch (err) {
          console.warn(`    ✗ translate failed review ${i + 1}: ${err.message}`);
        }
      }

      // Step 3: Standardize
      r.text = standardize(r.text);

      // Also clean title if present
      if (r.title) {
        r.title = removeMasks(r.title, hotel);
        r.title = standardize(r.title);
      }

      processed++;
    }

    const pct = ((processed / totalReviews) * 100).toFixed(1);
    console.log(`    → ${pct}% complete\n`);
  }

  // Write result
  writeFileSync(reviewsPath, JSON.stringify(reviewsByHotel, null, 2), "utf-8");
  console.log(`\n✓ Done!`);
  console.log(`  Total reviews: ${totalReviews}`);
  console.log(`  |MASK| removed: ${maskedCount}`);
  console.log(`  Translated: ${translatedCount}`);
  console.log(`  Output: ${reviewsPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
