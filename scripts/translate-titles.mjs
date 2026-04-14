/**
 * Translate all non-English review titles using bing-translate-api's
 * auto language detection (instead of heuristics).
 */
import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { translate } from "bing-translate-api";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const reviewsPath = join(ROOT, "src/data/reviews-by-hotel.json");
const backupPath = join(ROOT, "src/data/reviews-by-hotel.backup.json");

// Backup
copyFileSync(reviewsPath, backupPath);
console.log("Backup saved.\n");

const reviewsByHotel = JSON.parse(readFileSync(reviewsPath, "utf-8"));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let translatedCount = 0;

for (const [hotelId, reviews] of Object.entries(reviewsByHotel)) {
  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    if (!r.title || r.title.trim().length === 0) continue;

    try {
      // Use bing auto-detect (from=null) to detect language
      const res = await translate(r.title, null, "en");
      const detectedLang = res.language?.from || res.from;

      if (detectedLang && detectedLang !== "en") {
        const oldTitle = r.title;
        r.title = res.translation;
        // Ensure ends with punctuation
        if (r.title.length > 0 && !/[.!?]$/.test(r.title)) {
          r.title += ".";
        }
        // Capitalize first letter
        r.title = r.title.charAt(0).toUpperCase() + r.title.slice(1);
        translatedCount++;
        console.log(`  [${detectedLang}] "${oldTitle}" → "${r.title}"`);
      }

      await delay(400); // rate limit
    } catch (err) {
      console.warn(`  ✗ failed "${r.title}": ${err.message}`);
      await delay(1000);
    }
  }
}

writeFileSync(reviewsPath, JSON.stringify(reviewsByHotel, null, 2), "utf-8");
console.log(`\n✓ Done! Translated ${translatedCount} titles.`);
