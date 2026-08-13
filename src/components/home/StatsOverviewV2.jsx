import MomentumCard from './MomentumCard'

function MetricRing({ percent, color }) {
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${Math.max(4, percent)}%, rgba(255,255,255,0.08) 0)` }} aria-hidden="true">
      <span className="h-8 w-8 rounded-full bg-[#141a2a]" />
    </span>
  )
}

export default function StatsOverviewV2({ estimatedFocusMinutes, momentum, habits, onOpenFocus, onOpenMomentum, onOpenHabits }) {
  const completedHabits = habits.filter((habit) => habit.completed_today).length
  const focusGoal = 240
  const focusPercent = Math.min(100, Math.round((estimatedFocusMinutes / focusGoal) * 100))
  const habitPercent = habits.length ? Math.round((completedHabits / habits.length) * 100) : 0
  const focusLabel = estimatedFocusMinutes >= 60 ? `${Math.floor(estimatedFocusMinutes / 60)}h ${estimatedFocusMinutes % 60}m` : `${estimatedFocusMinutes}m`

  return (
    <section className="grid grid-cols-[minmax(0,1.35fr)_minmax(8.2rem,0.65fr)] gap-2.5 sm:grid-cols-[1.4fr_0.6fr] sm:gap-3">
      <MomentumCard momentum={momentum} onClick={onOpenMomentum} />
      <div className="grid gap-2.5 sm:gap-3">
        <MetricCard label="Focus" value={focusLabel} supporting="Today" percent={focusPercent} color="#8b5cf6" onClick={onOpenFocus} icon="◷" />
        <MetricCard label="Habits" value={`${completedHabits}/${habits.length}`} supporting={habits.length ? 'Completed' : 'Add your first'} percent={habitPercent} color="#42d6b0" onClick={onOpenHabits} icon="✿" />
      </div>
    </section>
  )
}

function MetricCard({ label, value, supporting, percent, color, onClick, icon }) {
  return (
    <button type="button" onClick={onClick} className="group relative min-h-[7rem] rounded-[1.35rem] bg-[linear-gradient(145deg,#151a2c,#101625)] p-3.5 text-left shadow-[0_12px_34px_rgba(0,0,0,0.24)] ring-1 ring-inset ring-white/[0.07] transition hover:-translate-y-0.5 hover:ring-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:p-4">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-white/58 sm:text-sm"><span className="text-violet-400" aria-hidden="true">{icon}</span>{label}</span>
      <span className="mt-2 block text-2xl font-semibold tracking-tight text-violet-300 sm:text-3xl">{value}</span>
      <span className="mt-1 block max-w-20 text-xs leading-4 text-white/48">{supporting}</span>
      <span className="absolute bottom-3 right-3 scale-75 sm:scale-90"><MetricRing percent={percent} color={color} /></span>
    </button>
  )
}
