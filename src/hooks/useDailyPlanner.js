import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useDailyPlanner(user) {
  const [plan, setPlan] = useState(null)
  const [plannerStatus, setPlannerStatus] = useState('')
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [plannerError, setPlannerError] = useState(null)

  async function loadDailyPlan(intensity = 'Balanced', forceRefresh = false) {
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
            userId: user.id,
            intensity,
            forceRefresh,
          },
        }
      )

      if (error) {
        console.error('Daily planner error:', error)

        if (error?.context) {
          try {
            const text = await error.context.text()
            console.error('Edge Function Response:', text)
          } catch (contextError) {
            console.error(
              'Could not read Edge Function error response:',
              contextError
            )
          }
        }

        setPlannerError(
          "Buddy couldn't generate your Morning Brief. Please try again."
        )

        setPlannerStatus('')
        return
      }

      if (!data?.plan) {
        console.error('Daily planner returned no plan:', data)

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
    } catch (error) {
      console.error('Unexpected daily planner error:', error)

      setPlannerError(
        "Buddy couldn't generate your Morning Brief. Please try again."
      )

      setPlannerStatus('')
    } finally {
      setPlannerLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setPlan(null)
      setPlannerError(null)
      setPlannerStatus('')
      return
    }

    loadDailyPlan('Balanced', false)
  }, [user])

  return {
    plan,
    plannerStatus,
    plannerLoading,
    plannerError,
    loadDailyPlan,
  }
}