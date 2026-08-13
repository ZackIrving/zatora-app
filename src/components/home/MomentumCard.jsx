function getMomentumCopy(momentum) {
  if (momentum >= 80) return { status: 'FLOWING', message: "You're on a roll. Keep the rhythm." }
  if (momentum >= 55) return { status: 'BUILDING', message: "You're on a roll. Keep stacking wins." }
  if (momentum >= 25) return { status: 'WARMING UP', message: 'The next small win will move you.' }
  return { status: 'STARTING', message: 'One easy step is enough to begin.' }
}

export default function MomentumCard({ momentum, onClick }) {
  const percent = Math.max(0, Math.min(100, Number(momentum) || 0))
  const copy = getMomentumCopy(percent)

  return (
    <button type="button" onClick={onClick} className="group relative min-h-[14.5rem] overflow-hidden rounded-[1.55rem] bg-[radial-gradient(circle_at_80%_76%,rgba(139,92,246,0.24),transparent_32%),linear-gradient(145deg,#151a30,#10162a)] p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-violet-300/15 transition hover:-translate-y-0.5 hover:ring-violet-300/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:p-6" aria-label={`Momentum ${percent} percent. Open Progress`}>
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.06em] text-white/78">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/12 text-violet-400" aria-hidden="true">↗</span>
        Momentum
      </div>

      <div className="mt-4 flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:gap-5">
        <span className="bg-gradient-to-b from-violet-300 to-violet-500 bg-clip-text text-6xl font-bold leading-none tracking-[-0.07em] text-transparent sm:text-7xl">{percent}</span>
        <span className="text-xs font-semibold tracking-[0.04em] text-violet-400 sm:mb-2 sm:text-sm sm:tracking-[0.05em]">{copy.status} ↗</span>
      </div>
      <p className="mt-2 max-w-[13rem] text-xs leading-5 text-white/72 sm:mt-3 sm:text-sm">{copy.message}</p>

      <svg viewBox="0 0 220 72" fill="none" aria-hidden="true" className="absolute bottom-3 right-3 h-20 w-[58%] text-violet-500/90">
        <defs><filter id="momentumGlow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <path d="M4 60c28-2 30-27 59-22 22 4 27 20 51 16 34-6 36-41 74-42 9 0 18-4 28-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" filter="url(#momentumGlow)" />
        <circle cx="216" cy="3" r="4" fill="currentColor" />
      </svg>
    </button>
  )
}
