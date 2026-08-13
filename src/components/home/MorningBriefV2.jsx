function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 9a7 7 0 0 1 11.5-2L20 12M4 12l2.4 5a7 7 0 0 0 11.5-2" />
    </svg>
  )
}

function BriefTimeIcon() {
  const hour = new Date().getHours()

  if (hour >= 18 || hour < 6) {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.2 15.5A8.4 8.4 0 0 1 8.5 3.8 8.5 8.5 0 1 0 20.2 15.5Z" /><path d="M16.7 4.2v2.2M15.6 5.3h2.2" /></svg>
  }

  if (hour >= 12) {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16h16M6 16a6 6 0 0 1 12 0" /><path d="M12 3v3M4.2 8.2l2.1 2.1M19.8 8.2l-2.1 2.1" /></svg>
  }

  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
}

function BriefHeader({ onRefresh }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center text-amber-300" aria-hidden="true"><BriefTimeIcon /></span>
        <h2 className="whitespace-nowrap text-base font-semibold tracking-tight text-white sm:text-xl">Daily Brief</h2>
      </div>
      <button type="button" onClick={onRefresh} className="inline-flex min-h-9 shrink-0 items-center gap-2 px-0 text-sm font-semibold text-violet-400 transition hover:text-violet-300 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Refresh Daily Brief">
        <RefreshIcon />
        Refresh
      </button>
    </div>
  )
}

function BuildMyDayButton({ onBuildMyDay }) {
  return (
    <button type="button" onClick={onBuildMyDay} className="group relative mt-6 flex min-h-[4rem] w-full items-center justify-center gap-2.5 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(100deg,#7857f6_0%,#9b52ee_52%,#bd4ad8_100%)] px-5 text-base font-bold text-white shadow-[0_16px_42px_rgba(139,92,246,0.34),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:text-lg">
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true" className="h-6 w-6 shrink-0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.7 4.5 2.5 6.3 7 7-4.5.7-6.3 2.5-7 7-.7-4.5-2.5-6.3-7-7 4.5-.7 6.3-2.5 7-7Z" fill="currentColor" strokeWidth="1.2" /><path d="M21.5 15.5c.35 2.1 1.4 3.15 3.5 3.5-2.1.35-3.15 1.4-3.5 3.5-.35-2.1-1.4-3.15-3.5-3.5 2.1-.35 3.15-1.4 3.5-3.5ZM21 3v3M19.5 4.5h3" strokeWidth="1.5" /></svg>
      <span>Build My Day</span>
    </button>
  )
}

function getPriorityTitle(priority) {
  if (typeof priority === 'string') return priority
  return priority?.task || priority?.title || ''
}

export default function MorningBriefV2({
  plan,
  plannerLoading,
  plannerStatus,
  plannerError,
  onRefresh,
  onBuildMyDay,
}) {
  if (plannerLoading) {
    return (
      <section className="rounded-[1.65rem] bg-[#111727] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)] sm:p-7" aria-label="Loading Daily Brief">
        <BriefHeader onRefresh={onRefresh} />
        <div className="mt-6 animate-pulse">
          <div className="h-6 w-3/4 rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-full rounded-full bg-white/[0.07]" />
          <div className="mt-2 h-4 w-4/5 rounded-full bg-white/[0.07]" />
        </div>
        <p className="mt-5 text-sm text-white/45">{plannerStatus || 'Franco is preparing your brief…'}</p>
      </section>
    )
  }

  if (plannerError) {
    return (
      <section className="rounded-[1.65rem] bg-[linear-gradient(145deg,rgba(69,22,38,0.92),rgba(22,19,32,0.96))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)] sm:p-7">
        <BriefHeader onRefresh={onRefresh} />
        <p className="mt-6 text-sm font-semibold text-rose-300">Daily Brief unavailable</p>
        <p className="mt-2 text-sm leading-6 text-white/65">{plannerError}</p>
        <button type="button" onClick={onRefresh} className="mt-5 min-h-11 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">Try again</button>
      </section>
    )
  }

  if (!plan) {
    return (
      <section className="rounded-[1.65rem] bg-[#111727] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)] sm:p-7">
        <BriefHeader onRefresh={onRefresh} />
        <p className="mt-5 text-sm leading-6 text-white/55">No plan is available yet. Franco can prepare one whenever you&apos;re ready.</p>
        <button type="button" onClick={onRefresh} className="mt-5 min-h-11 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Generate plan</button>
      </section>
    )
  }

  const priorities = (plan.priorities || []).map(getPriorityTitle).filter(Boolean).slice(0, 3)

  return (
    <section className="relative overflow-hidden rounded-[1.65rem] bg-[radial-gradient(circle_at_82%_40%,rgba(124,58,237,0.11),transparent_30%),linear-gradient(145deg,#121829,#0e1423)] p-5 shadow-[0_20px_65px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-violet-300/15 sm:p-7">
      <BriefHeader onRefresh={onRefresh} />

      <div className="mt-6 grid gap-6 sm:grid-cols-[1.15fr_0.85fr] sm:gap-8">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-semibold leading-7 tracking-[-0.02em] text-violet-300 sm:text-2xl sm:leading-8">
            {plan.greeting || "You're in a good spot today."}
          </h3>
          <p className="mt-2 whitespace-normal break-words text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
            {plan.summary || 'Focus on what matters most, and let the rest wait.'}
          </p>
        </div>

        {priorities.length > 0 && (
          <div className="min-w-0 sm:border-l sm:border-white/[0.07] sm:pl-7">
            <p className="text-sm font-semibold text-violet-400">Top priorities</p>
            <ol className="mt-3 space-y-3">
              {priorities.map((priority, index) => (
                <li key={`${priority}-${index}`} className="flex min-w-0 items-start gap-3 text-sm leading-5 text-white/82 sm:text-base">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-violet-400/65 text-xs font-semibold text-violet-300">{index + 1}</span>
                  <span className="min-w-0 break-words">{priority}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <BuildMyDayButton onBuildMyDay={onBuildMyDay} />
    </section>
  )
}
