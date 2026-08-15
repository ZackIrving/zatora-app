import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { sendBrowserNotification } from '../utils/notifications'

export function useFocusTimer(setReminderBanner, user, addXp, awardBadge, setBulldogReaction) {
  const [timerSeconds, setTimerSeconds] = useState(1500)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(25)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const hasSavedSessionRef = useRef(false)

  async function loadPomodoroStats() {
    if (!user) return

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading pomodoro stats:', error)
      return
    }

    setCompletedPomodoros(data.length)
  }

  async function savePomodoroSession(duration) {
    if (!user) return

    const { error } = await supabase
      .from('pomodoro_sessions')
      .insert({
        user_id: user.id,
        duration,
        completed: true,
      })

    if (error) {
      console.error('Error saving pomodoro session:', error)
      return
    }

    setCompletedPomodoros((current) => current + 1)

    if (addXp) {
      await addXp(25, 'Pomodoro completed')
    }

    if (awardBadge) {
      await awardBadge('first_pomodoro')
    }

    if (setBulldogReaction) {
      setBulldogReaction({
        type: 'pomodoro',
        message: 'Deep focus complete. That was a strong session.',
      })
    }
  }

  useEffect(() => {
    if (!user) return

    loadPomodoroStats()
  }, [user])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          setIsRunning(false)

          if (!hasSavedSessionRef.current) {
            hasSavedSessionRef.current = true
            savePomodoroSession(selectedDuration)
          }

          setReminderBanner(
            'Focus session complete. Take a short break.'
          )

          sendBrowserNotification(
            'Zatora',
            'Focus session complete. Take a short break.'
          )

          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, selectedDuration, setReminderBanner])

  function selectTimer(minutes) {
    hasSavedSessionRef.current = false
    setSelectedDuration(minutes)
    setTimerSeconds(minutes * 60)
    setIsRunning(false)
  }

  function resetTimer() {
    hasSavedSessionRef.current = false
    setTimerSeconds(selectedDuration * 60)
    setIsRunning(false)
  }

  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }

  return {
    timerSeconds,
    isRunning,
    setIsRunning,
    selectTimer,
    resetTimer,
    formatTimer,
    completedPomodoros,
  }
}