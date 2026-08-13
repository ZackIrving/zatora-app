import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

console.log('useHabits file loaded')

export function useHabits(user, addXp, awardBadge, setBulldogReaction) {
  const [habits, setHabits] = useState([])
  const [habitName, setHabitName] = useState('')
  const [habitStatus, setHabitStatus] = useState('')
  const [habitStats, setHabitStats] = useState({})

  useEffect(() => {
    if (user) {
      loadHabits()
    } else {
      setHabits([])
    }
  }, [user])

  async function loadHabits() {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading habits:', error)

      const cachedHabits = localStorage.getItem('focusflow_habits')

      if (cachedHabits) {
        setHabits(JSON.parse(cachedHabits))
        setHabitStatus('Offline mode: showing last saved habits.')
      } else {
        setHabitStatus('Could not load habits.')
      }

      return
    }

    const today = new Date().toISOString().split('T')[0]

    const resetHabits = (data || []).map((habit) => ({
      ...habit,
      completed_today:
        habit.last_completed_date === today ? habit.completed_today : false,
    }))

    setHabits(resetHabits)
    localStorage.setItem('focusflow_habits', JSON.stringify(resetHabits))
    await loadHabitStats(resetHabits)
  }

  function calculateHabitStreaks(logs) {
    const dates = logs
      .map((log) => log.completed_date)
      .sort()

    if (dates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
      }
    }

    let longestStreak = 1
    let runningStreak = 1

    for (let i = 1; i < dates.length; i++) {
      const previous = new Date(dates[i - 1])
      const current = new Date(dates[i])

      const difference =
        (current - previous) / (1000 * 60 * 60 * 24)

      if (difference === 1) {
        runningStreak += 1
        longestStreak = Math.max(longestStreak, runningStreak)
      } else if (difference > 1) {
        runningStreak = 1
      }
    }

    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const todayString = today.toISOString().split('T')[0]
    const yesterdayString = yesterday.toISOString().split('T')[0]

    let currentStreak = 0
    let checkDate = dates.includes(todayString)
      ? today
      : dates.includes(yesterdayString)
        ? yesterday
        : null

    if (checkDate) {
      const dateSet = new Set(dates)

      while (dateSet.has(checkDate.toISOString().split('T')[0])) {
        currentStreak += 1
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

    return {
      currentStreak,
      longestStreak,
      totalCompletions: dates.length,
    }
  }

  async function loadHabitStats(habitList) {
    if (!user) return

    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading habit stats:', error)
      return
    }

    const stats = {}

    habitList.forEach((habit) => {
      const logsForHabit = data.filter(
        (log) => log.habit_id === habit.id
      )

      stats[habit.id] = calculateHabitStreaks(logsForHabit)
    })

    setHabitStats(stats)
  }

  async function addHabit(event) {
    event.preventDefault()

    if (!habitName.trim()) {
      setHabitStatus('Enter a habit name first.')
      return
    }

    const { data, error } = await supabase
      .from('habits')
      .insert([
        {
          user_id: user.id,
          name: habitName.trim(),
          frequency: 'daily',
          completed_today: false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error adding habit:', error)
      setHabitStatus('Could not add habit.')
      return
    }

    setHabits((current) => [...current, data])
    setHabitName('')
    setHabitStatus('Habit added.')
  }

  async function toggleHabit(habit) {
    const updatedStatus = !habit.completed_today
    const today = new Date().toISOString().split('T')[0]

    setHabits((current) =>
      current.map((item) =>
        item.id === habit.id
          ? { ...item, completed_today: updatedStatus }
          : item
      )
    )

    const { error: habitError } = await supabase
      .from('habits')
      .update({
        completed_today: updatedStatus,
        last_completed_date: updatedStatus ? today : null,
      })
      .eq('id', habit.id)
      .eq('user_id', user.id)

    if (habitError) {
      console.error('Error updating habit:', habitError)
      setHabitStatus('Could not update habit.')
      return
    }

    if (updatedStatus) {
      const { error: logError } = await supabase
        .from('habit_logs')
        .upsert(
          {
            user_id: user.id,
            habit_id: habit.id,
            completed_date: today,
          },
          {
            onConflict: 'user_id,habit_id,completed_date',
          }
        )

      if (logError) {
        console.error('Error saving habit log:', logError)
        setHabitStatus('Habit completed, but streak log failed.')
        return
      }
    } else {
      const { error: deleteLogError } = await supabase
        .from('habit_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('habit_id', habit.id)
        .eq('completed_date', today)

      if (deleteLogError) {
        console.error('Error removing habit log:', deleteLogError)
        setHabitStatus('Habit unchecked, but streak log was not removed.')
        return
      }
    }

    await loadHabits()

    if (updatedStatus && addXp) {
      await addXp(5, 'Habit completed')
    }

    if (updatedStatus && awardBadge) {
      await awardBadge('first_habit')
    }

    if (updatedStatus && setBulldogReaction) {
      setBulldogReaction({
        type: 'habit',
        message: 'Nice consistency. Your routine is getting stronger.',
      })
    }

    setHabitStatus(updatedStatus ? 'Habit completed.' : 'Habit unchecked.')
  }

  async function deleteHabit(habit, options = {}) {
    const confirmed = options.confirmed || window.confirm(`Delete this habit?\n\n${habit.name}`)
    if (!confirmed) return

    setHabits((current) => current.filter((item) => item.id !== habit.id))

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habit.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting habit:', error)
      setHabitStatus('Could not delete habit.')
      return
    }

    setHabitStatus('Habit deleted.')
  }

  return {
    habits,
    habitName,
    setHabitName,
    habitStatus,
    habitStats,
    addHabit,
    toggleHabit,
    deleteHabit,
  }
}
