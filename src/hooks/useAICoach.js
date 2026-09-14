import { useState } from 'react'
import { supabase } from '../supabaseClient'

export function useAICoach(user) {
    const [coachInput, setCoachInput] = useState('')
    const [coachResponse, setCoachResponse] = useState(null)
    const [coachStatus, setCoachStatus] = useState('')
    const [coachTasksAdded, setCoachTasksAdded] = useState(false)

    async function getCoachResponse(event) {
        event.preventDefault()

        if (!coachInput.trim()) {
            setCoachStatus('Type what feels overwhelming first.')
            return
        }

        if (!user) {
            setCoachStatus('Sign in before using AI Coach.')
            return
        }

        setCoachStatus('Coach is thinking...')
        setCoachTasksAdded(false)

        const { data, error } = await supabase.functions.invoke('ai-task-coach', {
            body: {
                input: coachInput,
            },
        })

        if (error) {
            console.error('AI Coach request failed')
            setCoachStatus('Could not reach AI Coach.')
            return
        }

        try {
            const parsedResponse = JSON.parse(data.result)
            setCoachResponse(parsedResponse)
        } catch {
            console.error('AI Coach response parse failed')
            setCoachResponse({
                summary: data.result,
                tasks: [],
                startHere: '',
                encouragement: '',
            })
        }
        setCoachStatus('Coach response ready.')
    }

    return {
        coachInput,
        setCoachInput,
        coachResponse,
        coachStatus,
        coachTasksAdded,
        setCoachTasksAdded,
        getCoachResponse,
    }
}
