import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { emptyTaskForm, starterTasks } from '../constants/appData'
import { deriveTaskReward } from '../components/home/taskPresentation'

export function useTasks(user, updateStreak, addXp, awardBadge, setBulldogReaction) {
    const [tasks, setTasks] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [syncStatus, setSyncStatus] = useState('Waiting for login...')
    const [taskForm, setTaskForm] = useState(emptyTaskForm)
    const [showTaskForm, setShowTaskForm] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState(null)
    const [editForm, setEditForm] = useState(emptyTaskForm)

    useEffect(() => {
        if (user) {
            loadTasks(user.id)
        } else {
            setTasks([])
            setSyncStatus('Waiting for login...')
        }
    }, [user])

    async function loadTasks(userId) {
        setIsLoading(true)
        setSyncStatus('Loading your tasks...')

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error loading tasks:', error)

            const cachedTasks = localStorage.getItem('focusflow_tasks')

            if (cachedTasks) {
                setTasks(JSON.parse(cachedTasks))
                setSyncStatus('Offline mode: showing last saved tasks.')
            } else {
                setSyncStatus('Could not load your Supabase tasks.')
            }

            setIsLoading(false)
            return
        }

        if (!data || data.length === 0) {
            const tasksWithUser = starterTasks.map((task) => ({
                ...task,
                user_id: userId,
            }))

            const { data: insertedTasks, error: insertError } = await supabase
                .from('tasks')
                .insert(tasksWithUser)
                .select()

            if (insertError) {
                console.error('Error creating starter tasks:', insertError)
                setTasks([])
                setSyncStatus('Starter tasks could not save to Supabase.')
            } else {
                setTasks(data)
                localStorage.setItem('focusflow_tasks', JSON.stringify(data))
                setSyncStatus('Synced with Supabase')
            }
        } else {
            setTasks(data)
            setSyncStatus('Synced with Supabase')
        }

        setIsLoading(false)
    }

    const completedTasks = tasks.filter((task) => task.done)
    const activeTasks = tasks.filter((task) => !task.done)
    const totalXP = completedTasks.reduce(
        (sum, task) => sum + Number(task.reward || 0),
        0
    )
    const focusScore =
        tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
    const completedToday = completedTasks.length
    const nextTask = activeTasks[0]?.title || 'No active tasks. Nice work.'
    const estimatedFocusMinutes = completedTasks.reduce((sum, task) => {
        const minutes = parseInt(task.time)
        return sum + (isNaN(minutes) ? 0 : minutes)
    }, 0)

    const nextTinyStep = useMemo(() => {
        const unfinished = tasks.find((task) => !task.done)
        if (!unfinished) return 'Celebrate. You cleared your main queue.'
        return `Start with: ${unfinished.title}`
    }, [tasks])

    function updateTaskForm(field, value) {
        setTaskForm((current) => ({
            ...current,
            [field]: field === 'reward' ? Number(value) : value,
        }))
    }

    function updateEditForm(field, value) {
        setEditForm((current) => ({
            ...current,
            [field]: field === 'reward' ? Number(value) : value,
        }))
    }

    function startEditingTask(task) {
        setEditingTaskId(task.id)
        setEditForm({
            title: task.title || '',
            category: task.category || 'Personal',
            energy: task.energy || 'Low',
            time: task.time || '15 min',
            reward: Number(task.reward || 10),
            done: Boolean(task.done),
            recurring: Boolean(task.recurring),
            recurrence: task.recurrence || '',
        })
    }

    function cancelEditingTask() {
        setEditingTaskId(null)
        setEditForm(emptyTaskForm)
    }

    async function handleCreateCustomTask(event) {
        event.preventDefault()

        if (!taskForm.title.trim()) {
            setSyncStatus('Add a task title first.')
            return
        }

        await addTask({
            title: taskForm.title.trim(),
            category: taskForm.category,
            energy: taskForm.energy,
            time: taskForm.time,
            reward: deriveTaskReward(taskForm),
            done: false,
            recurring: Boolean(taskForm.recurring),
            recurrence: taskForm.recurring ? taskForm.recurrence || 'daily' : null,
            last_generated_date: null,
            reminder_enabled: Boolean(taskForm.reminder_enabled),
            reminder_time: taskForm.reminder_enabled
                ? taskForm.reminder_time || null
                : null,
            notification_sent: false,
        })

        setTaskForm(emptyTaskForm)
        setShowTaskForm(false)
    }

    async function toggleTask(taskToUpdate) {
        if (!user) return

        const updatedDoneStatus = !taskToUpdate.done
        const today = new Date().toISOString().split('T')[0]

        const taskUpdates = {
            done: updatedDoneStatus,
        }

        if (updatedDoneStatus && taskToUpdate.recurring === true) {
            taskUpdates.last_generated_date = today
        }

        setTasks((current) =>
            current.map((task) =>
                task.id === taskToUpdate.id
                    ? { ...task, ...taskUpdates }
                    : task
            )
        )

        setSyncStatus('Saving...')

        const { error } = await supabase
            .from('tasks')
            .update(taskUpdates)
            .eq('id', taskToUpdate.id)
            .eq('user_id', user.id)
            .select()

        if (error) {
            console.error('Error updating task:', error)
            setSyncStatus('Save failed. Refresh to reload from Supabase.')
            return
        }

        if (updatedDoneStatus && updateStreak) {
            await updateStreak()
        }

        if (updatedDoneStatus && addXp) {
            await addXp(10, 'Task completed')
        }

        if (updatedDoneStatus && awardBadge) {
            await awardBadge('first_task')
        }

        if (updatedDoneStatus && setBulldogReaction) {
            setBulldogReaction({
                type: 'task',
                message: 'Nice task win. Small progress still counts.',
            })
        }

        setSyncStatus('Synced with Supabase')
    }

    async function resetDailyRecurringTasks() {
        if (!user) return

        const today = new Date().toISOString().split('T')[0]

        const { error } = await supabase
            .from('tasks')
            .update({
                done: false,
                notification_sent: false,
                last_generated_date: today,
            })
            .eq('user_id', user.id)
            .eq('recurring', true)
            .eq('recurrence', 'daily')
            .eq('done', true)
            .lt('last_generated_date', today)

        if (error) {
            console.error('Error resetting daily recurring tasks:', error)
        }
    }

    useEffect(() => {
        if (!user || !tasks.length) return

        resetDailyRecurringTasks()
    }, [user, tasks.length])

    async function addTask(task) {
        if (!user) {
            setSyncStatus('Sign in before adding tasks.')
            return
        }

        setSyncStatus('Saving...')

        const { data, error } = await supabase
            .from('tasks')
            .insert([{ ...task, user_id: user.id }])
            .select()
            .single()

        if (error) {
            console.error('Error adding task:', error)
            setSyncStatus('Task could not save to Supabase.')
            return
        }

        setTasks((current) => [...current, data])
        setSyncStatus('Synced with Supabase')
    }

    async function saveEditedTask(taskToEdit) {
        if (!user) return

        if (!editForm.title.trim()) {
            setSyncStatus('Edited task needs a title.')
            return
        }

        const updatedTask = {
            title: editForm.title.trim(),
            category: editForm.category.trim() || 'Personal',
            energy: editForm.energy,
            time: editForm.time,
            reward: deriveTaskReward(editForm),
            recurring: Boolean(editForm.recurring),
            recurrence: editForm.recurring ? editForm.recurrence || 'daily' : null,
        }

        setTasks((current) =>
            current.map((task) =>
                task.id === taskToEdit.id ? { ...task, ...updatedTask } : task
            )
        )

        setSyncStatus('Saving edit...')

        const { error } = await supabase
            .from('tasks')
            .update(updatedTask)
            .eq('id', taskToEdit.id)
            .eq('user_id', user.id)

        if (error) {
            console.error('Error editing task:', error)
            setSyncStatus('Edit failed. Refresh to reload from Supabase.')
            return
        }

        setEditingTaskId(null)
        setEditForm(emptyTaskForm)
        setSyncStatus('Synced with Supabase')
    }

    async function deleteTask(taskToDelete, options = {}) {
        if (!user) return

        const confirmed = options.confirmed || window.confirm(`Delete this task?\n\n${taskToDelete.title}`)
        if (!confirmed) return

        setTasks((current) => current.filter((task) => task.id !== taskToDelete.id))
        setSyncStatus('Deleting...')

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskToDelete.id)
            .eq('user_id', user.id)

        if (error) {
            console.error('Error deleting task:', error)
            setSyncStatus('Delete failed. Refresh to reload from Supabase.')
            return
        }

        setSyncStatus('Synced with Supabase')
    }

    function addTinyTask() {
        addTask({
            title: 'Do a 5-minute reset task',
            category: 'Momentum',
            energy: 'Low',
            time: '5 min',
            reward: 10,
            done: false,
        })
    }

    return {
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
    }
}
