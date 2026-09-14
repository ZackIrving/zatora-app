import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { emptyTaskForm } from '../constants/appData'
import ReminderBanner from './ReminderBanner'
import BrainDumpPage from './BrainDumpPage'
import FocusTimerPage from './FocusTimerPage'
import ProgressPage from './ProgressPage'
import DailyPlanPage from './DailyPlanPage'
import WeeklyReviewPage from './WeeklyReviewPage'
import DistractionBlockerPage from './DistractionBlockerPage'
import AICoachPage from './AICoachPage'
import NotificationsPage from './NotificationsPage'
import SettingsPage from './SettingsPage'
import HomePageV2 from './home/HomePageV2'
import AppLayout from './layout/AppLayout'
import TopBar from './layout/TopBar'
import { useFocusTimer } from '../hooks/useFocusTimer'
import { useTasks } from '../hooks/useTasks'
import { useBrainDump } from '../hooks/useBrainDump'
import { useStreaks } from '../hooks/useStreaks'
import { useHabits } from '../hooks/useHabits'
import { useDailyPlan } from '../hooks/useDailyPlan'
import { useProgress } from '../hooks/useProgress'
import { useBadges } from '../hooks/useBadges'
import { useWeeklyReview } from '../hooks/useWeeklyReview'
import { getMigratedLocalStorageValue } from '../utils/localStorage'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useAICoach } from '../hooks/useAICoach'
import { useDailyPlanner } from '../hooks/useDailyPlanner'

function getDisplayName(user) {
  if (!user) return ''

  const metadataName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.first_name
  if (metadataName?.trim()) return metadataName.trim()

  return localStorage.getItem(`zatora_display_name_${user.id}`) || ''
}

export default function AuthenticatedApp({ user, signOut }) {
  const { dailyPlan, dailyPlanStatus, updateDailyPlan, saveDailyPlan } = useDailyPlan(user)
  const { plan, plannerStatus, plannerLoading, plannerError, loadDailyPlan } = useDailyPlanner(user)
  const { weeklyReview, weeklyReviewStatus, loadWeeklyReview } = useWeeklyReview(user)
  const [activeMode, setActiveMode] = useState('Today')
  const [taskSheetView, setTaskSheetView] = useState('choices')
  const [displayNameOverride, setDisplayNameOverride] = useState(null)
  const [reminderBanner, setReminderBanner] = useState('')
  const [, setBulldogReaction] = useState(null)
  const [dailyPlanningReminder, setDailyPlanningReminder] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    const lastReminder = getMigratedLocalStorageValue(
      'zatora_daily_planning',
      'focusflow_daily_planning'
    )
    if (lastReminder === today) return ''
    localStorage.setItem('zatora_daily_planning', today)
    return '📋 Take 2 minutes to set your Top 3 priorities for today.'
  })
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const { currentStreak, longestStreak, updateStreak } = useStreaks(user)
  const { xp, level, progressStatus, addXp, getLevelProgress } = useProgress(user)
  const { earnedBadges, badgeStatus, awardBadge } = useBadges(user)
  const { pushStatus, enablePushNotifications } = usePushNotifications(user)
  const levelProgress = getLevelProgress()
  const {
    timerSeconds,
    isRunning,
    setIsRunning,
    selectTimer,
    resetTimer,
    formatTimer,
    completedPomodoros,
  } = useFocusTimer(setReminderBanner, user, addXp, awardBadge, setBulldogReaction)
  const {
    tasks,
    isLoading,
    syncStatus,
    taskForm,
    setTaskForm,
    showTaskForm,
    setShowTaskForm,
    editingTaskId,
    editForm,
    completedTasks,
    activeTasks,
    totalXP,
    focusScore,
    estimatedFocusMinutes,
    updateTaskForm,
    updateEditForm,
    startEditingTask,
    cancelEditingTask,
    handleCreateCustomTask,
    toggleTask,
    addTask,
    addTinyTask,
    saveEditedTask,
    deleteTask,
    setSyncStatus,
    setTasks,
  } = useTasks(user, updateStreak, addXp, awardBadge, setBulldogReaction)

  const {
    habits,
    habitName,
    setHabitName,
    habitStatus,
    habitStats,
    addHabit,
    toggleHabit,
    deleteHabit,
  } = useHabits(user, addXp, awardBadge, setBulldogReaction)
  const { brainDump, setBrainDump, createBreakdown } = useBrainDump(
    user,
    setTasks,
    setSyncStatus,
    setActiveMode
  )
  const {
    coachInput,
    setCoachInput,
    coachResponse,
    coachStatus,
    getCoachResponse,
    coachTasksAdded,
    setCoachTasksAdded,
  } = useAICoach(user)
  const displayName = displayNameOverride && displayNameOverride.userId === user?.id
    ? displayNameOverride.value
    : getDisplayName(user)

  async function addCoachTasksToToday(coachTasks) {
    if (coachTasksAdded) return

    for (const task of coachTasks) {
      await addTask({
        title: task.title,
        category: task.category || 'AI Coach',
        energy: task.energy || 'Low',
        time: task.time || '10 min',
        reward: task.reward || 10,
        done: false,
        recurring: false,
        recurrence: '',
        reminder_enabled: false,
        reminder_time: null,
      })
    }

    setCoachTasksAdded(true)
  }

  useEffect(() => {
    if (!tasks.length) return

    const interval = setInterval(() => {
      const now = new Date().getTime()

      tasks.forEach(async (task) => {
        if (
          task.reminder_enabled &&
          task.reminder_time &&
          !task.done &&
          !task.notification_sent
        ) {
          const reminderTime = new Date(task.reminder_time).getTime()
          const difference = reminderTime - now

          if (difference <= 60000 && difference > -120000) {
            setReminderBanner(`Reminder: Time to work on ${task.title}`)

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Zatora Reminder', {
                body: `Time to work on: ${task.title}`,
                icon: '/icon-192.png',
              })
            }

            await supabase.from('tasks').update({ notification_sent: true }).eq('id', task.id)
            setTasks((current) =>
              current.map((item) =>
                item.id === task.id ? { ...item, notification_sent: true } : item
              )
            )
          }
        }
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [tasks, setTasks])

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      setReminderBanner('Browser notifications are not supported on this device.')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    setReminderBanner(
      permission === 'granted'
        ? 'Notifications enabled. Zatora can now notify you when sessions end.'
        : 'Notifications were not enabled.'
    )
  }

  async function enableZatoraNotifications() {
    await enablePushNotifications()
    if ('Notification' in window) setNotificationPermission(Notification.permission)
  }

  function openQuickTask() {
    setActiveMode('Today')
    setTaskSheetView('choices')
    setShowTaskForm(true)
  }

  async function saveDisplayName(nextDisplayName) {
    const value = nextDisplayName.trim()
    if (!user || !value) return 'Display name could not be saved.'

    localStorage.setItem(`zatora_display_name_${user.id}`, value)
    setDisplayNameOverride({ userId: user.id, value })

    const { error } = await supabase.auth.updateUser({
      data: { display_name: value },
    })

    if (error) {
      console.error('Display name profile update failed:', error)
      return 'Saved on this device.'
    }

    return 'Display name saved.'
  }

  const homeStatusMessages = [progressStatus, badgeStatus, pushStatus].filter(Boolean)

  return (
    <AppLayout
      activeMode={activeMode}
      onNavigate={setActiveMode}
      onQuickAdd={openQuickTask}
      topBar={
        <TopBar
          activeMode={activeMode}
          onNavigate={setActiveMode}
          notificationPermission={notificationPermission}
          onSignOut={signOut}
          syncStatus={syncStatus}
        />
      }
    >
      <ReminderBanner reminderBanner={reminderBanner} setReminderBanner={setReminderBanner} />

      {dailyPlanningReminder && activeMode === 'Today' && (
        <button
          type="button"
          onClick={() => setDailyPlanningReminder('')}
          className="mb-5 flex w-full items-center justify-between gap-4 rounded-2xl border border-violet-400/15 bg-violet-500/[0.08] px-4 py-3 text-left text-sm text-violet-100/80 transition hover:bg-violet-500/[0.12]"
        >
          <span>{dailyPlanningReminder}</span>
          <span className="text-xl text-white/40" aria-hidden="true">×</span>
        </button>
      )}

      {activeMode === 'Today' && homeStatusMessages.length > 0 && (
        <div className="mb-5 space-y-2" aria-live="polite">
          {homeStatusMessages.map((status) => (
            <p key={status} className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white/55">{status}</p>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="rounded-[1.6rem] border border-white/[0.07] bg-white/[0.04] p-8 text-center">
          <h2 className="text-xl font-semibold text-white">Loading your Zatora plan…</h2>
          <p className="mt-2 text-sm text-white/45">Connecting securely.</p>
        </div>
      )}

      {!isLoading && activeMode === 'Today' && (
        <HomePageV2
          user={user}
          displayName={displayName}
          tasks={tasks}
          plan={plan}
          plannerLoading={plannerLoading}
          plannerStatus={plannerStatus}
          plannerError={plannerError}
          loadDailyPlan={loadDailyPlan}
          onBuildMyDay={() => {}}
          setActiveMode={setActiveMode}
          showTaskForm={showTaskForm}
          setShowTaskForm={setShowTaskForm}
          taskSheetView={taskSheetView}
          setTaskSheetView={setTaskSheetView}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          updateTaskForm={updateTaskForm}
          handleCreateCustomTask={handleCreateCustomTask}
          emptyTaskForm={emptyTaskForm}
          addTinyTask={addTinyTask}
          editingTaskId={editingTaskId}
          editForm={editForm}
          updateEditForm={updateEditForm}
          saveEditedTask={saveEditedTask}
          cancelEditingTask={cancelEditingTask}
          toggleTask={toggleTask}
          startEditingTask={startEditingTask}
          deleteTask={deleteTask}
          estimatedFocusMinutes={estimatedFocusMinutes}
          focusScore={focusScore}
          level={level}
          xp={xp}
          levelProgress={levelProgress}
          completedPomodoros={completedPomodoros}
          habits={habits}
          habitName={habitName}
          setHabitName={setHabitName}
          habitStatus={habitStatus}
          habitStats={habitStats}
          addHabit={addHabit}
          toggleHabit={toggleHabit}
          deleteHabit={deleteHabit}
          earnedBadges={earnedBadges}
        />
      )}

      {!isLoading && activeMode !== 'Today' && (
        <div className={`space-y-5 pt-1 ${activeMode === 'Settings' || activeMode === 'Notifications' || activeMode === 'Daily Plan' ? 'text-white' : 'legacy-page text-slate-900'}`}>
          {activeMode === 'Daily Plan' && (
            <DailyPlanPage
              dailyPlan={dailyPlan}
              dailyPlanStatus={dailyPlanStatus}
              updateDailyPlan={updateDailyPlan}
              saveDailyPlan={saveDailyPlan}
              francoMessage={plan?.bulldog_message || ''}
              francoAvailable={Boolean(plan?.bulldog_message) && !plannerLoading}
            />
          )}
          {activeMode === 'Brain Dump' && (
            <BrainDumpPage brainDump={brainDump} setBrainDump={setBrainDump} createBreakdown={createBreakdown} onBack={() => setActiveMode('Today')} />
          )}
          {activeMode === 'Focus Timer' && (
            <FocusTimerPage requestNotificationPermission={requestNotificationPermission} notificationPermission={notificationPermission} timerSeconds={timerSeconds} formatTimer={formatTimer} selectTimer={selectTimer} isRunning={isRunning} setIsRunning={setIsRunning} resetTimer={resetTimer} completedPomodoros={completedPomodoros} />
          )}
          {activeMode === 'Progress' && (
            <ProgressPage focusScore={focusScore} totalXP={totalXP} tasks={tasks} completedTasks={completedTasks} activeTasks={activeTasks} habits={habits} currentStreak={currentStreak} longestStreak={longestStreak} earnedBadges={earnedBadges} />
          )}
          {activeMode === 'Weekly Review' && (
            <WeeklyReviewPage weeklyReview={weeklyReview} weeklyReviewStatus={weeklyReviewStatus} loadWeeklyReview={loadWeeklyReview} />
          )}
          {activeMode === 'Distraction Blocker' && <DistractionBlockerPage />}
          {activeMode === 'AI Coach' && (
            <AICoachPage coachInput={coachInput} setCoachInput={setCoachInput} coachResponse={coachResponse} coachStatus={coachStatus} getCoachResponse={getCoachResponse} addCoachTasksToToday={addCoachTasksToToday} coachTasksAdded={coachTasksAdded} />
          )}
          {activeMode === 'Settings' && (
            <SettingsPage
              key={user.id}
              displayName={displayName}
              onSaveDisplayName={saveDisplayName}
              notificationPermission={notificationPermission}
              onEnableNotifications={enableZatoraNotifications}
            />
          )}
          {activeMode === 'Notifications' && (
            <NotificationsPage onOpenSettings={() => setActiveMode('Settings')} />
          )}
        </div>
      )}
    </AppLayout>
  )
}
