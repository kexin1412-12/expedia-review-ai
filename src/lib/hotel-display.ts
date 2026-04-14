import { HotelRecord } from "@/types";

const hotelImages: Record<string, string> = {
	"110f01b8ae518a0ee41047bce5c22572988a435e10ead72dc1af793bba8ce0b0": "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?w=800&q=80",
	"db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
	"5f5a0cd8662f0ddf297f2d27358f680daab5d3ac22fd45a4e1c3c3ec2c101a12": "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80",
	"3b984f3ba8df55b2609a1e33fd694cf8407842e1d833c9b4d993b07fc83a2820": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
	"9a0043fd4258a1286db1e253ca591662b3aac849da12d0d4f67e08b8f59be65f": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
	"e52d67a758ce4ad0229aacc97e5dfe89984c384c51a70208f9e0cc65c9cd4676": "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
};

const fallbackImage = "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80";

export function getHotelImage(hotel: HotelRecord): string {
	return hotelImages[hotel.id] ?? fallbackImage;
}

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
