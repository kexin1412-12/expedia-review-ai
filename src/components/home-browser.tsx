"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { HotelRecord } from "@/types";
import { HotelCard } from "@/components/hotel-card";
import { currencyFromRating } from "@/lib/hotel-display";

const pageSize = 8;
const ratingOptions = new Set(["All", "9", "8", "7"]);
const sortOptions = new Set(["recommended", "rating", "reviews"]);
const priceOptions = new Set(["All", "0-180", "181-240", "241-320", "321+"]);

export function HomeBrowser({ hotels }: { hotels: HotelRecord[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(hotels.map((hotel) => hotel.country).filter(Boolean))).sort()],
    [hotels],
  );

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [country, setCountry] = useState(searchParams.get("country") ?? "All");
  const [minRating, setMinRating] = useState(searchParams.get("minRating") ?? "All");
  const [priceRange, setPriceRange] = useState(searchParams.get("price") ?? "All");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    (searchParams.get("amenities") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "recommended");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? "1") || 1));
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const allAmenities = useMemo(
    () => Array.from(new Set(hotels.flatMap((hotel) => hotel.amenities))).sort(),
    [hotels],
  );
  const featuredAmenities = useMemo(() => allAmenities.slice(0, 10), [allAmenities]);

  useEffect(() => {
    const nextSearch = searchParams.get("q") ?? "";
    const nextCountry = countries.includes(searchParams.get("country") ?? "") ? (searchParams.get("country") as string) : "All";
    const nextRating = ratingOptions.has(searchParams.get("minRating") ?? "") ? (searchParams.get("minRating") as string) : "All";
    const nextPrice = priceOptions.has(searchParams.get("price") ?? "") ? (searchParams.get("price") as string) : "All";
    const nextAmenities = (searchParams.get("amenities") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => allAmenities.includes(item));
    const nextSort = sortOptions.has(searchParams.get("sort") ?? "") ? (searchParams.get("sort") as string) : "recommended";
    const nextPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

    setSearch(nextSearch);
    setCountry(nextCountry);
    setMinRating(nextRating);
    setPriceRange(nextPrice);
    setSelectedAmenities(nextAmenities);
    setSortBy(nextSort);
    setPage(nextPage);
  }, [allAmenities, countries, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedPage = String(page);

    if (search) params.set("q", search);
    else params.delete("q");

    if (country !== "All") params.set("country", country);
    else params.delete("country");

    if (minRating !== "All") params.set("minRating", minRating);
    else params.delete("minRating");

    if (priceRange !== "All") params.set("price", priceRange);
    else params.delete("price");

    if (selectedAmenities.length) params.set("amenities", selectedAmenities.join(","));
    else params.delete("amenities");

    if (sortBy !== "recommended") params.set("sort", sortBy);
    else params.delete("sort");

    if (normalizedPage !== "1") params.set("page", normalizedPage);
    else params.delete("page");

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [country, minRating, page, pathname, priceRange, router, search, searchParams, selectedAmenities, sortBy]);

  function matchesPriceRange(price: number) {
    if (priceRange === "All") return true;
    if (priceRange === "0-180") return price <= 180;
    if (priceRange === "181-240") return price >= 181 && price <= 240;
    if (priceRange === "241-320") return price >= 241 && price <= 320;
    if (priceRange === "321+") return price >= 321;
    return true;
  }

  function toggleAmenity(amenity: string) {
    resetPage(() => {
      setSelectedAmenities((current) =>
        current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
      );
    });
  }

  const filteredHotels = useMemo(() => {
    const ratingFloor = minRating === "All" ? null : Number(minRating);

    const filtered = hotels.filter((hotel) => {
      const pricing = currencyFromRating(hotel.rating);
      const haystack = [hotel.name, hotel.city, hotel.province, hotel.country, ...hotel.amenities]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !deferredSearch || haystack.includes(deferredSearch);
      const matchesCountry = country === "All" || hotel.country === country;
      const matchesRating = ratingFloor === null || (hotel.rating ?? 0) >= ratingFloor;
      const matchesPrice = matchesPriceRange(pricing.nightly);
      const matchesAmenities = selectedAmenities.every((amenity) => hotel.amenities.includes(amenity));

      return matchesSearch && matchesCountry && matchesRating && matchesPrice && matchesAmenities;
    });

    return filtered.sort((left, right) => {
      if (sortBy === "rating") return (right.rating ?? 0) - (left.rating ?? 0);
      if (sortBy === "reviews") return right.reviewCount - left.reviewCount;
      return (right.rating ?? 0) * right.reviewCount - (left.rating ?? 0) * left.reviewCount;
    });
  }, [country, deferredSearch, hotels, minRating, priceRange, selectedAmenities, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredHotels.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleHotels = filteredHotels.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetPage(update: () => void) {
    startTransition(() => {
      update();
      setPage(1);
    });
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-5 rounded-[30px] border border-slate-200 bg-white p-6 shadow-card xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#0b1638]">Explore hotels</h2>
          <p className="mt-1 text-slate-600">Search, narrow the list, then enter a hotel to open its dedicated review experience.</p>
        </div>
        <div className="rounded-full border border-slate-300 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-expediaBlue shadow-sm">
          {filteredHotels.length} matches across {totalPages} pages
        </div>
      </div>

      <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Search destination, hotel, or amenity
          <input
            value={search}
            onChange={(event) => resetPage(() => setSearch(event.target.value))}
            placeholder="Pompei, breakfast, spa, airport..."
            className="rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-expediaBlue"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Country
          <select
            value={country}
            onChange={(event) => resetPage(() => setCountry(event.target.value))}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-expediaBlue"
          >
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Minimum rating
          <select
            value={minRating}
            onChange={(event) => resetPage(() => setMinRating(event.target.value))}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-expediaBlue"
          >
            {[
              ["All", "Any score"],
              ["9", "9.0+ Exceptional"],
              ["8", "8.0+ Wonderful"],
              ["7", "7.0+ Very good"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Price per night
          <select
            value={priceRange}
            onChange={(event) => resetPage(() => setPriceRange(event.target.value))}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-expediaBlue"
          >
            <option value="All">Any price</option>
            <option value="0-180">Up to $180</option>
            <option value="181-240">$181 to $240</option>
            <option value="241-320">$241 to $320</option>
            <option value="321+">$321 and up</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => resetPage(() => setSortBy(event.target.value))}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-expediaBlue"
          >
            <option value="recommended">Recommended</option>
            <option value="rating">Highest rating</option>
            <option value="reviews">Most reviewed</option>
          </select>
        </label>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-600">Amenities</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {featuredAmenities.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-expediaBlue bg-expediaBlue text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-expediaBlue hover:text-expediaBlue"
                  }`}
                >
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        {visibleHotels.map((hotel, index) => (
          <HotelCard key={hotel.id} hotel={hotel} index={(currentPage - 1) * pageSize + index} />
        ))}
      </div>

      {visibleHotels.length === 0 ? (
        <div className="mt-6 rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600 shadow-card">
          No hotels match these filters. Try a broader search or lower the rating threshold.
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-expediaBlue hover:text-expediaBlue disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).slice(0, 6).map((_, index) => {
            const targetPage = index + 1;
            return (
              <button
                key={targetPage}
                type="button"
                onClick={() => setPage(targetPage)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  targetPage === currentPage
                    ? "bg-expediaBlue text-white"
                    : "border border-slate-300 text-slate-700 hover:border-expediaBlue hover:text-expediaBlue"
                }`}
              >
                {targetPage}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-expediaBlue hover:text-expediaBlue disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}