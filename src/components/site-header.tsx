export function SiteHeader() {
  return (
    <section className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto max-w-[1480px] px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#0a438b] px-4 py-2 text-lg font-bold text-white">expedia</div>
            <div className="hidden text-sm text-slate-500 md:block">Hotels • Reviews • Smart follow-up</div>
          </div>
          <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-expediaBlue">
            Adaptive Review Prompting
          </div>
        </div>
      </div>
    </section>
  );
}