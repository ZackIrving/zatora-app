import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useDailyPlanner(user) {
  const [plan, setPlan] = useState(null)
  const [plannerStatus, setPlannerStatus] = useState('')
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [plannerError, setPlannerError] = useState(null)

  const loadDailyPlan = useCallback(async (
    intensity = 'Balanced',
    forceRefresh = false
  ) => {
    if (!user) return

    setPlannerLoading(true)
    setPlannerError(null)

    setPlannerStatus(
      forceRefresh
        ? 'Buddy is rebuilding your plan...'
        : 'Buddy is checking your day...'
    )

    try {
      const { data, error } = await supabase.functions.invoke(
        'daily-ai-planner',
        {
          body: {
            intensity,
            forceRefresh,
          },
        }
      )

      if (error) {
        console.error('Daily planner request failed')

        setPlannerError(
          "Buddy couldn't generate your Morning Brief. Please try again."
        )

        setPlannerStatus('')
        return
      }

      if (!data?.plan) {
        console.error('Daily planner returned no plan')

        setPlannerError(
          "Buddy couldn't find a plan for today. Please try again."
        )

        setPlannerStatus('')
        return
      }

      setPlan(data.plan)

      setPlannerStatus(
        data.source === 'cache'
          ? 'Loaded today’s plan.'
          : 'Built a fresh plan for today.'
      )
    } catch {
      console.error('Unexpected daily planner request failure')

      setPlannerError(
        "Buddy couldn't generate your Morning Brief. Please try again."
      )

      setPlannerStatus('')
    } finally {
      setPlannerLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadDailyPlan('Balanced', false)
    })

    return () => {
      cancelled = true
    }
  }, [user, loadDailyPlan])

  return {
    plan,
    plannerStatus,
    plannerLoading,
    plannerError,
    loadDailyPlan,
  }
}
