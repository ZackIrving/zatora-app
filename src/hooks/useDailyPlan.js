import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const today = new Date().toISOString().split('T')[0]

export function useDailyPlan(user) {
  const [dailyPlan, setDailyPlan] = useState({
    top_priorities: '',
    must_do: '',
    should_do: '',
    could_do: '',
  })

  const [dailyPlanStatus, setDailyPlanStatus] = useState('')

  useEffect(() => {
    if (user) {
      loadDailyPlan()
    }
  }, [user])

  async function loadDailyPlan() {
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle()

    if (error) {
      console.error('Error loading daily plan:', error)
      setDailyPlanStatus('Could not load daily plan.')
      return
    }

    if (data) {
      setDailyPlan({
        top_priorities: data.top_priorities || '',
        must_do: data.must_do || '',
        should_do: data.should_do || '',
        could_do: data.could_do || '',
      })
    }
  }

  function updateDailyPlan(field, value) {
    setDailyPlan((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function saveDailyPlan() {
    if (!user) return

    setDailyPlanStatus('Saving daily plan...')

    const { error } = await supabase
      .from('daily_plans')
      .upsert(
        {
          user_id: user.id,
          plan_date: today,
          ...dailyPlan,
        },
        { onConflict: 'user_id,plan_date' },
      )

    if (error) {
      console.error('Error saving daily plan:', error)
      setDailyPlanStatus('Could not save daily plan.')
      return
    }

    setDailyPlanStatus('Daily plan saved.')
  }

  return {
    dailyPlan,
    dailyPlanStatus,
    updateDailyPlan,
    saveDailyPlan,
  }
}