/**
 * Rebuild hotels.json from Description_PROC.csv with ALL fields.
 * Preserves existing hotel names and review counts.
 *
 * Usage: node scripts/build-hotels.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const csvPath = join(ROOT, "data/raw/Description_PROC.csv");
const hotelsPath = join(ROOT, "src/data/hotels.json");

/* ── CSV parser (handles quoted fields with commas) ── */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

/** Parse "[item1, item2, item3]" into string[] */
function parseList(raw) {
  if (!raw || raw === "[]") return [];
  const inner = raw.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Clean |MASK| from text */
function cleanMask(text) {
  if (!text) return "";
  return text
    .replace(/\|MASK\|/g, "the hotel")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Format amenity key to display name: "breakfast_included" → "Breakfast Included" */
function formatAmenityName(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Load existing hotels.json for names ── */
const existingHotels = JSON.parse(readFileSync(hotelsPath, "utf-8"));
const nameMap = Object.fromEntries(existingHotels.map((h) => [h.id, h.name]));
const reviewCountMap = Object.fromEntries(existingHotels.map((h) => [h.id, h.reviewCount]));

/* ── Parse CSV ── */
const csvText = readFileSync(csvPath, "utf-8");
const rows = parseCSV(csvText);

console.log(`Parsed ${rows.length} hotels from CSV\n`);

const hotels = rows.map((row) => {
  const id = row.eg_property_id;
  const popularAmenities = parseList(row.popular_amenities_list);

  return {
    id,
    name: nameMap[id] || `${row.city || "Unknown"} ${row.country || ""} Stay`.trim(),
    city: row.city || null,
    province: row.province || null,
    country: row.country || null,
    rating: row.guestrating_avg_expedia ? parseFloat(row.guestrating_avg_expedia) : null,
    starRating: row.star_rating ? parseFloat(row.star_rating) : null,
    description: cleanMask(row.property_description?.replace(/<br>/g, "\n")),
    areaDescription: cleanMask(row.area_description),
    amenities: popularAmenities.map(formatAmenityName),
    reviewCount: reviewCountMap[id] || 0,

    // ── New detailed fields ──
    popularAmenities: popularAmenities.map(formatAmenityName),

    amenityCategories: {
      accessibility: parseList(row.property_amenity_accessibility),
      activitiesNearby: parseList(row.property_amenity_activities_nearby),
      businessServices: parseList(row.property_amenity_business_services),
      conveniences: parseList(row.property_amenity_conveniences),
      familyFriendly: parseList(row.property_amenity_family_friendly),
      foodAndDrink: parseList(row.property_amenity_food_and_drink),
      guestServices: parseList(row.property_amenity_guest_services),
      internet: parseList(row.property_amenity_internet),
      langsSpoken: parseList(row.property_amenity_langs_spoken),
      more: parseList(row.property_amenity_more),
      outdoor: parseList(row.property_amenity_outdoor),
      parking: parseList(row.property_amenity_parking),
      spa: parseList(row.property_amenity_spa),
      thingsToDo: parseList(row.property_amenity_things_to_do),
    },

    checkIn: {
      startTime: row.check_in_start_time || null,
      endTime: row.check_in_end_time || null,
      instructions: parseList(row.check_in_instructions),
    },

    checkOut: {
      time: row.check_out_time || null,
      policy: parseList(row.check_out_policy),
    },

    policies: {
      pet: parseList(row.pet_policy),
      childrenAndExtraBed: parseList(row.children_and_extra_bed_policy),
      knowBeforeYouGo: parseList(row.know_before_you_go),
    },
  };
});

writeFileSync(hotelsPath, JSON.stringify(hotels, null, 2), "utf-8");
console.log(`✓ Written ${hotels.length} hotels to ${hotelsPath}`);
hotels.forEach((h) => {
  const catCount = Object.values(h.amenityCategories).filter((a) => a.length > 0).length;
  console.log(`  ${h.name}: ${h.popularAmenities.length} popular, ${catCount} categories, checkin=${h.checkIn.startTime}`);
});
