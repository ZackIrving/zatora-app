export default function Header({
  user,
  signOut,
  syncStatus,
  focusScore,
  totalXP,
  completedTasks,
  tasks,
  currentStreak,
  longestStreak,
}) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
            Logged in as {user.email}
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Zatora ADHD Productivity
          </h1>

          <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
            One productivity system that syncs across your computer and phone.
            Start a task on desktop, continue on mobile, and keep your momentum
            visible everywhere.
          </p>

          <p className="mt-3 text-sm font-semibold text-indigo-700">
            {syncStatus}
          </p>

          <button
            onClick={signOut}
            className="mt-4 rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-300"
          >
            Log Out
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl bg-indigo-100 p-4 text-center">
            <p className="text-xs font-semibold text-indigo-700 sm:text-sm">
              Focus
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              {focusScore}%
            </h2>
          </div>

          <div className="rounded-2xl bg-emerald-100 p-4 text-center">
            <p className="text-xs font-semibold text-emerald-700 sm:text-sm">
              XP
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              {totalXP}
            </h2>
          </div>
          
          <div className="rounded-2xl bg-orange-100 p-4 text-center">
          <p className="text-xs font-semibold text-orange-700 sm:text-sm">
            Streak
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            {currentStreak}
          </h2>
        </div>

        <div className="rounded-2xl bg-purple-100 p-4 text-center">
          <p className="text-xs font-semibold text-purple-700 sm:text-sm">
            Best
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            {longestStreak}
          </h2>
        </div>

        <div className="rounded-2xl bg-amber-100 p-4 text-center">
          <p className="text-xs font-semibold text-amber-700 sm:text-sm">
            Tasks
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            {completedTasks.length}/{tasks.length}
          </h2>
        </div>
      </div>
    </div>
    </header >
  )
}