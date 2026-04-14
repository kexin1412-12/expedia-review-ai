import { Sparkles } from "lucide-react";
import { HomeBrowser } from "@/components/home-browser";
import { SiteHeader } from "@/components/site-header";
import { listHotels } from "@/lib/data-store";

export default function HomePage() {
  const hotels = listHotels();

  return (
    <main className="min-h-screen bg-expediaBg text-slate-900">
      <SiteHeader />

      <section className="border-b border-slate-200/60 bg-expediaBg px-6 py-16 text-center">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold tracking-[0.14em] text-expediaBlue">
            <Sparkles className="h-4 w-4" />
            AI-ASSISTED REVIEW FLOW
          </div>
          <h1 className="mt-7 text-5xl font-bold tracking-tight text-[#0b1638] md:text-6xl">
            Write your Expedia-style review,
            <br />
            then let one smart follow-up do the rest.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-slate-600">
            Browse properties on the landing page, then click a hotel to enter its dedicated review experience with guest comments, AI summary, and review submission.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] px-6 py-10">
        <HomeBrowser hotels={hotels} />
      </div>
    </main>
  );
}
