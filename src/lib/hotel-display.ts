import { HotelImage, HotelRecord } from "@/types";

const photoSets = [
  [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1444201983204-c43cbd584d93?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1439130490301-25e322d88054?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1400&q=80",
  ],
];

const galleryLabels = ["Exterior", "Lobby", "Guest room", "Dining", "View"];

function hashHotelId(id: string) {
  return Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function currencyFromRating(rating: number | null) {
  const base = Math.max(110, Math.round((rating ?? 8) * 28));
  return {
    nightly: base,
    oldNightly: base + 36,
    total: base * 2 + 84,
    oldTotal: base * 2 + 152,
  };
}

export function hotelSubtitle(hotel: HotelRecord) {
  return [hotel.city, hotel.province, hotel.country].filter(Boolean).join(", ");
}

export function initials(hotel: HotelRecord) {
  return `${hotel.city?.[0] ?? "H"}${hotel.country?.[0] ?? "T"}`;
}

export function hotelGradient(index: number) {
  const gradients = [
    "from-sky-500 via-cyan-400 to-blue-600",
    "from-amber-400 via-orange-400 to-pink-500",
    "from-emerald-400 via-teal-400 to-cyan-500",
    "from-violet-500 via-fuchsia-400 to-rose-400",
    "from-blue-700 via-indigo-600 to-sky-500",
  ];

  return gradients[index % gradients.length];
}

export function formatReviewDate(value: string) {
  return value;
}

function normalizeSentence(text: string) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[,.;:\-\s]+/, "")
    .trim();

  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function looksCorrupted(text: string) {
  return (
    !text ||
    /^[,.;:\-\s]/.test(text) ||
    /\s{2,}/.test(text) ||
    /\b(?:hotel|inn)\s{2,}/i.test(text) ||
    /\bby\s{2,}/i.test(text)
  );
}

function withEndingPunctuation(text: string) {
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : `${text}...`;
}

export function formatHotelDescription(hotel: HotelRecord) {
  const cleaned = withEndingPunctuation(normalizeSentence(hotel.description));

  if (!looksCorrupted(hotel.description) && cleaned) {
    return cleaned;
  }

  const location = hotelSubtitle(hotel) || "a well-connected location";
  const amenities = hotel.amenities.slice(0, 4).join(", ").toLowerCase();
  return `${hotel.name} is a stay in ${location} with guest-friendly features like ${amenities || "popular amenities"}.`;
}

export function formatAreaDescription(hotel: HotelRecord) {
  const cleaned = withEndingPunctuation(normalizeSentence(hotel.areaDescription));

  if (!looksCorrupted(hotel.areaDescription) && cleaned.length >= 80) {
    return cleaned;
  }

  const location = hotelSubtitle(hotel) || hotel.city || "the area";
  const amenities = hotel.amenities.slice(0, 3).join(", ").toLowerCase();
  return `${hotel.name} is positioned in ${location}, giving guests a practical base for exploring nearby attractions while still having easy access to ${amenities || "essential amenities"}.`;
}

export function getHotelGallery(hotel: HotelRecord): HotelImage[] {
  const setIndex = hashHotelId(hotel.id) % photoSets.length;
  const photoSet = photoSets[setIndex];

  return photoSet.map((src, index) => ({
    src,
    alt: `${hotel.name} ${galleryLabels[index]}`,
    label: galleryLabels[index],
  }));
}