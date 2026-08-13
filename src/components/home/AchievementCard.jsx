export default function AchievementCard({ earnedBadges, completedPomodoros, onOpenProgress }) {
  const recent = earnedBadges?.[0]?.badges
  const hasAchievement = Boolean(recent || completedPomodoros > 0)
  const title = recent?.name || (completedPomodoros > 0 ? 'Focus rhythm building' : 'Your next achievement')
  const description = recent?.description || (completedPomodoros > 0
    ? `${completedPomodoros} focus ${completedPomodoros === 1 ? 'session' : 'sessions'} completed`
    : 'Complete a task, habit, or focus session to unlock it.')

  return (
    <section className="relative flex min-h-[6.5rem] items-center gap-4 overflow-hidden rounded-[1.45rem] bg-[radial-gradient(circle_at_8%_50%,rgba(245,158,11,0.17),transparent_28%),linear-gradient(135deg,#211b1b,#171722)] px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.26)] ring-1 ring-inset ring-amber-300/15 sm:px-6">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-500/12 text-3xl text-amber-300 ring-1 ring-inset ring-amber-300/22" aria-hidden="true">{hasAchievement ? '🏆' : '☆'}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-300">Recent Achievement</p>
        <h2 className="mt-1 truncate text-sm font-semibold text-white/88 sm:text-base">{title}</h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/48 sm:text-sm">{description}</p>
      </div>
      <button type="button" onClick={onOpenProgress} className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full bg-white/[0.04] px-4 text-sm font-semibold text-white/78 ring-1 ring-inset ring-white/14 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:inline-flex">
        View Progress <span aria-hidden="true">›</span>
      </button>
      <button type="button" onClick={onOpenProgress} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl text-white/48 hover:bg-white/[0.06] hover:text-white sm:hidden" aria-label="View Progress">›</button>
    </section>
  )
}
