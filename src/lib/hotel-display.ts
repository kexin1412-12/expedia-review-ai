import { HotelRecord } from "@/types";

export function hotelSubtitle(hotel: HotelRecord) {
	return [hotel.city, hotel.province, hotel.country].filter(Boolean).join(", ");
}

export function initials(hotel: HotelRecord) {
	const left = hotel.city?.[0] ?? hotel.name?.[0] ?? "H";
	const right = hotel.country?.[0] ?? hotel.name?.[1] ?? "T";
	return `${left}${right}`.toUpperCase();
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
