export default function AchievementCard({ earnedBadges, completedPomodoros, onOpenProgress }) {
  const recent = earnedBadges?.[0]?.badges
  const hasAchievement = Boolean(recent || completedPomodoros > 0)
  const title = recent?.name || (completedPomodoros > 0 ? 'Focus rhythm building' : 'Your next achievement')
  const description = recent?.description || (completedPomodoros > 0
    ? `${completedPomodoros} focus ${completedPomodoros === 1 ? 'session' : 'sessions'} completed`
    : 'Complete a task, habit, or focus session to unlock it.')

  return (
    <section className="relative grid min-h-[6.5rem] grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 overflow-hidden rounded-[1.45rem] bg-[radial-gradient(circle_at_8%_50%,rgba(245,158,11,0.17),transparent_28%),linear-gradient(135deg,#211b1b,#171722)] px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.26)] ring-1 ring-inset ring-amber-300/15 min-[360px]:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:flex sm:px-6">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-500/12 text-3xl text-amber-300 ring-1 ring-inset ring-amber-300/22" aria-hidden="true">{hasAchievement ? '🏆' : '☆'}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-300">Recent Achievement</p>
        <h2 className="mt-1 truncate text-sm font-semibold text-white/88 sm:text-base">{title}</h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/48 sm:text-sm">{description}</p>
      </div>
      <button type="button" onClick={onOpenProgress} className="col-span-2 inline-flex h-11 w-fit grow-0 shrink-0 self-center justify-self-end items-center justify-center gap-1 whitespace-nowrap border-0 bg-transparent px-0 text-sm font-semibold text-white/78 transition hover:text-white focus:outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-amber-300 min-[360px]:col-span-1 sm:h-auto sm:min-h-11 sm:w-auto sm:gap-2 sm:rounded-full sm:bg-white/[0.04] sm:px-4 sm:text-sm sm:ring-1 sm:ring-inset sm:ring-white/14 sm:hover:bg-white/[0.08]">
        <span>View Progress</span>
        <span className="sm:hidden" aria-hidden="true">→</span>
        <span className="hidden sm:inline" aria-hidden="true">›</span>
      </button>
    </section>
  )
}
