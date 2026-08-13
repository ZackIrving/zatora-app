export default function BrainDumpPage({
  brainDump,
  setBrainDump,
  createBreakdown,
  onBack,
}) {
  return (
    <main className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-100" aria-label="Back to Home">
        <span aria-hidden="true">←</span> Back
      </button>
      <h2 className="text-3xl font-bold">Brain Dump → Action Splitter</h2>

      <p className="mt-2 max-w-2xl text-slate-500">
        Dump the chaos here. The app turns it into small next actions and saves
        them to Supabase.
      </p>

      <textarea
        value={brainDump}
        onChange={(event) => setBrainDump(event.target.value)}
        className="mt-6 min-h-[220px] w-full rounded-2xl border border-slate-300 p-4 text-base focus:outline-none focus:ring-4 focus:ring-indigo-200"
        placeholder="Example: I need to study A+, update my homelab GitHub, work on my Shopify store, clean my room, apply for jobs, and I don’t know where to start..."
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={createBreakdown}
          className="rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:bg-indigo-700"
        >
          Break This Down + Save
        </button>

        <button
          onClick={() => setBrainDump('')}
          className="rounded-2xl bg-slate-200 px-6 py-4 font-semibold transition hover:bg-slate-300"
        >
          Clear
        </button>
      </div>
    </main>
  )
}
