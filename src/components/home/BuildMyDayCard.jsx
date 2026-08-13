export default function BuildMyDayCard({ onBuildMyDay }) {
  return (
    <button
      type="button"
      onClick={onBuildMyDay}
      className="group flex min-h-24 w-full items-center gap-4 rounded-[1.55rem] border border-violet-300/20 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-4 text-left shadow-[0_16px_45px_rgba(67,62,246,0.35)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:px-7"
    >
      <span className="text-3xl" aria-hidden="true">✨</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold tracking-tight text-white">Build My Day</span>
        <span className="mt-0.5 block text-sm text-white/75">Let Franco plan your perfect day</span>
      </span>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 shrink-0 text-white transition group-hover:translate-x-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  )
}
