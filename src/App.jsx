import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { appModes, emptyTaskForm, starterTasks } from './constants/appData'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import ReminderBanner from './components/ReminderBanner'
import Header from './components/Header'
import NavigationTabs from './components/NavigationTabs'
import DailyStats from './components/DailyStats'
import CustomTaskForm from './components/CustomTaskForm'
import TaskCard from './components/TaskCard'
import BrainDumpPage from './components/BrainDumpPage'
import FocusTimerPage from './components/FocusTimerPage'
import ProgressPage from './components/ProgressPage'
import { useFocusTimer } from './hooks/useFocusTimer'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import { useBrainDump } from './hooks/useBrainDump'
import { useStreaks } from './hooks/useStreaks'
import { useHabits } from './hooks/useHabits'
import HabitTracker from './components/HabitTracker'
import AITaskCoach from './components/AITaskCoach'
import DailyPlanPage from './components/DailyPlanPage'
import { useDailyPlan } from './hooks/useDailyPlan'
import { useProgress } from './hooks/useProgress'
import { useBadges } from './hooks/useBadges'
import BadgeCollection from './components/BadgeCollection'
import BulldogCompanion from './components/BulldogCompanion'
import WeeklyReviewPage from './components/WeeklyReviewPage'
import { useWeeklyReview } from './hooks/useWeeklyReview'
import DistractionBlockerPage from './components/DistractionBlockerPage'
import { usePushNotifications } from './hooks/usePushNotifications'
import AICoachPage from './components/AICoachPage'
import { useAICoach } from './hooks/useAICoach'
import { useDailyPlanner } from './hooks/useDailyPlanner'
import TodayPage from './components/TodayPage'

export default function ADHDProductivityApp() {
  const {
    user,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    authStatus,
    passwordRecoveryStatus,
    isAuthLoading,
    isAuthSubmitting,
    isPasswordRecovery,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    cancelPasswordRecovery,
  } = useAuth()
  const {
    dailyPlan,
    dailyPlanStatus,
    updateDailyPlan,
    saveDailyPlan,
  } = useDailyPlan(user)
  const {
    plan,
    plannerStatus,
    plannerLoading,
    plannerError,
    loadDailyPlan,
  } = useDailyPlanner(user)
  const {
    weeklyReview,
    weeklyReviewStatus,
    loadWeeklyReview,
  } = useWeeklyReview(user)
  const [activeMode, setActiveMode] = useState('Today')
  const [reminderBanner, setReminderBanner] = useState('')
  const [bulldogReaction, setBulldogReaction] = useState(null)
  const [dailyPlanningReminder, setDailyPlanningReminder] = useState('')
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const lastReminder = localStorage.getItem('focusflow_daily_planning')

    if (lastReminder !== today) {
      setDailyPlanningReminder(
        '📋 Take 2 minutes to set your Top 3 priorities for today.'
      )

      localStorage.setItem('focusflow_daily_planning', today)
    }
  }, [])

  const {
    currentStreak,
    longestStreak,
    updateStreak,
  } = useStreaks(user)
  const [timerMinutes, setTimerMinutes] = useState(25)
  const {
    xp,
    level,
    progressStatus,
    addXp,
    getLevelProgress,
  } = useProgress(user)
  const {
    earnedBadges,
    badgeStatus,
    awardBadge,
  } = useBadges(user)
  const {
    pushStatus,
    enablePushNotifications,
  } = usePushNotifications(user)
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
    completedToday,
    nextTask,
    estimatedFocusMinutes,
    nextTinyStep,
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
  const {
    brainDump,
    setBrainDump,
    createBreakdown,
  } = useBrainDump(user, setTasks, setSyncStatus, setActiveMode)
  const {
    coachInput,
    setCoachInput,
    coachResponse,
    coachStatus,
    getCoachResponse,
    coachTasksAdded,
    setCoachTasksAdded,
  } = useAICoach(
    user,
    tasks,
    habits,
    totalXP
  )

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

            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('FocusFlow Reminder', {
                body: `Time to work on: ${task.title}`,
                icon: '/icon-192.png',
              })
            }

            await supabase
              .from('tasks')
              .update({ notification_sent: true })
              .eq('id', task.id)

            setTasks((current) =>
              current.map((item) =>
                item.id === task.id
                  ? { ...item, notification_sent: true }
                  : item
              )
            )
          }
        }
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [tasks])
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      setReminderBanner('Browser notifications are not supported on this device.')
      return
    }

    const permission = await Notification.requestPermission()

    setNotificationPermission(permission)

    if (permission === 'granted') {
      setReminderBanner(
        'Notifications enabled. FocusFlow can now notify you when sessions end.'
      )
    } else {
      setReminderBanner('Notifications were not enabled.')
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold">FocusFlow</h1>
          <p className="mt-2 text-slate-500">Checking login status...</p>
        </div>
      </div>
    )
  }

  if (isPasswordRecovery) {
    return (
      <ResetPasswordScreen
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        passwordRecoveryStatus={passwordRecoveryStatus}
        isAuthSubmitting={isAuthSubmitting}
        updatePassword={updatePassword}
        cancelPasswordRecovery={cancelPasswordRecovery}
      />
    )
  }

  if (!user) {
    return (
      <AuthScreen
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authStatus={authStatus}
        isAuthSubmitting={isAuthSubmitting}
        signIn={signIn}
        signUp={signUp}
        requestPasswordReset={requestPasswordReset}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <Header
          user={user}
          signOut={signOut}
          syncStatus={syncStatus}
          focusScore={focusScore}
          totalXP={totalXP}
          completedTasks={completedTasks}
          tasks={tasks}
        />
        <ReminderBanner
          reminderBanner={reminderBanner}
          setReminderBanner={setReminderBanner}
        />

        {dailyPlanningReminder && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-800">
            {dailyPlanningReminder}
          </div>
        )}
        <NavigationTabs
          appModes={appModes}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
        />

        {user && (
          <section className="mb-5 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-700">
                  FocusFlow Level
                </p>
                <h2 className="text-2xl font-bold text-indigo-950">
                  Level {level}
                </h2>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm font-semibold text-indigo-700">
                  Total XP
                </p>
                <p className="text-2xl font-bold text-indigo-950">
                  {xp} XP
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-indigo-800">
                <span>
                  {levelProgress.isMaxLevel
                    ? 'Max level reached'
                    : `${levelProgress.xpIntoLevel} / ${levelProgress.xpNeededForNextLevel} XP to next level`}
                </span>

                <span>{levelProgress.progressPercent}%</span>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${levelProgress.progressPercent}%` }}
                />
              </div>
            </div>

            {progressStatus && (
              <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-medium text-indigo-700">
                {progressStatus}
              </p>
            )}

            {badgeStatus && (
              <p className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-800">
                🏆 {badgeStatus}
              </p>
            )}
          </section>
        )}

        {isLoading && (
          <main className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <h2 className="text-2xl font-bold">Loading your FocusFlow tasks...</h2>
            <p className="mt-2 text-slate-500">Connecting to Supabase.</p>
          </main>
        )}

        {!isLoading && activeMode === 'Today' && (
          <TodayPage
            tasks={tasks}
            plan={plan}
            plannerLoading={plannerLoading}
            plannerStatus={plannerStatus}
            plannerError={plannerError}
            loadDailyPlan={loadDailyPlan}
            showTaskForm={showTaskForm}
            setShowTaskForm={setShowTaskForm}
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
            completedToday={completedToday}
            totalXP={totalXP}
            activeTasks={activeTasks}
            estimatedFocusMinutes={estimatedFocusMinutes}
            nextTask={nextTask}
            level={level}
            xp={xp}
            bulldogReaction={bulldogReaction}
            setBulldogReaction={setBulldogReaction}
            completedPomodoros={completedPomodoros}
            habits={habits}
            habitName={habitName}
            setHabitName={setHabitName}
            habitStatus={habitStatus}
            habitStats={habitStats}
            addHabit={addHabit}
            toggleHabit={toggleHabit}
            deleteHabit={deleteHabit}
          />
        )}

        {!isLoading && activeMode === 'Daily Plan' && (
          <DailyPlanPage
            dailyPlan={dailyPlan}
            dailyPlanStatus={dailyPlanStatus}
            updateDailyPlan={updateDailyPlan}
            saveDailyPlan={saveDailyPlan}
          />
        )}

        {!isLoading && activeMode === 'Brain Dump' && (
          <BrainDumpPage
            brainDump={brainDump}
            setBrainDump={setBrainDump}
            createBreakdown={createBreakdown}
          />
        )}

        {!isLoading && activeMode === 'Focus Timer' && (
          <FocusTimerPage
            requestNotificationPermission={requestNotificationPermission}
            notificationPermission={notificationPermission}
            timerSeconds={timerSeconds}
            formatTimer={formatTimer}
            selectTimer={selectTimer}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            resetTimer={resetTimer}
            completedPomodoros={completedPomodoros}
          />
        )}

        {!isLoading && activeMode === 'Progress' && (
          <ProgressPage
            focusScore={focusScore}
            totalXP={totalXP}
            tasks={tasks}
            completedTasks={completedTasks}
            activeTasks={activeTasks}
            habits={habits}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            earnedBadges={earnedBadges}
          />
        )}

        {!isLoading && activeMode === 'Weekly Review' && (
          <WeeklyReviewPage
            weeklyReview={weeklyReview}
            weeklyReviewStatus={weeklyReviewStatus}
            loadWeeklyReview={loadWeeklyReview}
          />
        )}

        {!isLoading && activeMode === 'Distraction Blocker' && (
          <DistractionBlockerPage />
        )}

        {!isLoading && activeMode === 'AI Coach' && (
          <AICoachPage
            coachInput={coachInput}
            setCoachInput={setCoachInput}
            coachResponse={coachResponse}
            coachStatus={coachStatus}
            getCoachResponse={getCoachResponse}
            addCoachTasksToToday={addCoachTasksToToday}
            coachTasksAdded={coachTasksAdded}
          />
        )}
      </div>
    </div>
  )
}




