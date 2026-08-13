import { useEffect, useMemo, useState } from 'react'
import ConfirmationModal from '../ConfirmationModal'
import AchievementCard from './AchievementCard'
import FrancoHero from './FrancoHero'
import MorningBriefV2 from './MorningBriefV2'
import StatsOverviewV2 from './StatsOverviewV2'
import TodayPlan, { TaskCreationModal } from './TodayPlan'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getUserName(user, displayName) {
  const metadataName = displayName || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.first_name
  return metadataName ? metadataName.trim().split(' ')[0] : 'there'
}

export default function HomePageV2(props) {
  const [showHabits, setShowHabits] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const greeting = useMemo(() => getGreeting(), [])
  const userName = useMemo(() => getUserName(props.user, props.displayName), [props.displayName, props.user])

  function requestDelete(type, item) {
    setPendingDelete({ type, item })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const { type, item } = pendingDelete
    setPendingDelete(null)
    if (type === 'habit') await props.deleteHabit(item, { confirmed: true })
    else await props.deleteTask(item, { confirmed: true })
  }

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      <FrancoHero greeting={greeting} userName={userName} momentum={props.focusScore} />
      <MorningBriefV2
        plan={props.plan}
        plannerLoading={props.plannerLoading}
        plannerStatus={props.plannerStatus}
        plannerError={props.plannerError}
        onRefresh={() => props.loadDailyPlan('Balanced', true)}
        onBuildMyDay={props.onBuildMyDay}
      />
      <TodayPlan {...props} deleteTask={(task) => requestDelete('task', task)} />
      <StatsOverviewV2
        estimatedFocusMinutes={props.estimatedFocusMinutes}
        momentum={props.focusScore}
        habits={props.habits}
        onOpenFocus={() => props.setActiveMode('Focus Timer')}
        onOpenMomentum={() => props.setActiveMode('Progress')}
        onOpenHabits={() => setShowHabits(true)}
      />
      <AchievementCard earnedBadges={props.earnedBadges} completedPomodoros={props.completedPomodoros} onOpenProgress={() => props.setActiveMode('Progress')} />
      {showHabits && <HabitPanel {...props} deleteHabit={(habit) => requestDelete('habit', habit)} onClose={() => setShowHabits(false)} />}
      <TaskCreationModal {...props} onOpenHabits={() => setShowHabits(true)} />
      <ConfirmationModal
        isOpen={Boolean(pendingDelete)}
        title={`Delete this ${pendingDelete?.type || 'item'}?`}
        description={pendingDelete ? `“${pendingDelete.item.title || pendingDelete.item.name}” will be permanently removed.` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function HabitPanel({ habits, habitName, setHabitName, habitStatus, habitStats, addHabit, toggleHabit, deleteHabit, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/78 backdrop-blur-md" aria-label="Close habits" />
      <section role="dialog" aria-modal="true" aria-labelledby="daily-habits-title" className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] bg-[linear-gradient(155deg,#15222a,#0e171d)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_30px_100px_rgba(0,0,0,0.72)] ring-1 ring-inset ring-emerald-300/12 sm:max-w-xl sm:rounded-[2rem] sm:p-6">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/16 sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/60">Daily rhythm</p><h2 id="daily-habits-title" className="mt-1 text-2xl font-semibold text-white">Habits</h2><p className="mt-1 text-sm text-white/45">Small routines that support your focus.</p></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-2xl text-white/45 hover:bg-white/[0.09] hover:text-white" aria-label="Close habits">&times;</button>
        </div>
        <form onSubmit={addHabit} className="mt-5 flex gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">Habit name</span><input value={habitName} onChange={(event) => setHabitName(event.target.value)} className="zatora-input" placeholder="Add a small daily habit" /></label>
          <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-[#07110d] hover:bg-emerald-400">Add</button>
        </form>
        {habitStatus && <p className="mt-3 text-xs text-emerald-300/75">{habitStatus}</p>}
        <div className="mt-4 space-y-2">
          {habits.length === 0 && <p className="rounded-xl bg-white/[0.04] p-4 text-sm text-white/45">No habits yet. Add one tiny routine to begin.</p>}
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-3 rounded-xl bg-white/[0.035] p-3 ring-1 ring-inset ring-white/[0.06]">
              <button type="button" onClick={() => toggleHabit(habit)} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${habit.completed_today ? 'border-emerald-500 bg-emerald-500 text-[#07110d]' : 'border-emerald-500/70 text-transparent'}`} aria-label={habit.completed_today ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}>✓</button>
              <div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${habit.completed_today ? 'text-white/35 line-through' : 'text-white/85'}`}>{habit.name}</p><p className="mt-0.5 text-xs text-white/35">{habitStats?.[habit.id]?.currentStreak || 0} day streak</p></div>
              <button type="button" onClick={() => deleteHabit(habit)} className="min-h-10 rounded-lg px-2 text-xs font-semibold text-rose-300/75 hover:bg-rose-500/10 hover:text-rose-300">Delete</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
