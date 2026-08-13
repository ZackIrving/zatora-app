import { useState } from 'react'
import { deriveTaskPriority, deriveTaskReward, getTaskIconType } from './taskPresentation'

const energyStyles = {
  High: { text: 'text-violet-300', surface: 'bg-violet-500/12' },
  Medium: { text: 'text-amber-300', surface: 'bg-amber-500/10' },
  Low: { text: 'text-emerald-300', surface: 'bg-emerald-500/10' },
  Creative: { text: 'text-fuchsia-300', surface: 'bg-fuchsia-500/10' },
}

const priorityStyles = {
  High: { text: 'text-rose-300', surface: 'bg-rose-500/12', accent: 'bg-rose-400' },
  Medium: { text: 'text-amber-300', surface: 'bg-amber-500/12', accent: 'bg-amber-400' },
  Low: { text: 'text-teal-300', surface: 'bg-teal-500/12', accent: 'bg-teal-400' },
}

function formatReminder(reminderTime) {
  const reminderDate = new Date(reminderTime)
  if (Number.isNaN(reminderDate.getTime())) return reminderTime

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const reminderDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate())

  let dayLabel
  if (reminderDay.getTime() === today.getTime()) dayLabel = 'Today'
  else if (reminderDay.getTime() === tomorrow.getTime()) dayLabel = 'Tomorrow'
  else dayLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(reminderDate)

  const timeLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(reminderDate)
  return `${dayLabel} ${timeLabel}`
}

function MissionIcon({ task }) {
  const type = getTaskIconType(task)
  const common = { viewBox: '0 0 24 24', fill: 'none', className: 'h-6 w-6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

  if (type === 'fitness') return <svg {...common}><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></svg>
  if (type === 'notebook') return <svg {...common}><path d="M6 4h13v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M8 4v16M11 8h5M11 12h5" /></svg>
  if (type === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></svg>
  if (type === 'technical') return <svg {...common}><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" /></svg>
  if (type === 'target') return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="m15 9 5-5M17 4h3v3" /></svg>
  return <svg {...common}><path d="M5 12.5 9.5 17 19 7" /></svg>
}

function PriorityIcon({ priority }) {
  if (priority === 'High') return <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5"><path d="M9.2 1.2c.5 2.3-.7 3.3-1.6 4.4-.9 1-1.4 1.8-.8 3.1.3-.8.9-1.4 1.7-2 .2 1.5 1.7 2.2 1.7 4A2.3 2.3 0 0 1 8 13.2a2.4 2.4 0 0 1-2.4-2.5c0-.5.1-1 .3-1.5-1.2 1-2 2.3-2 3.7 0 2 1.8 3.1 4 3.1 2.5 0 4.3-1.5 4.3-4.1 0-2.1-1.3-3.3-3-4.7.4 1.4-.1 2.2-.8 2.8.2-1.5-.6-2.4-.3-3.8.2-1.2 1.2-2.4 1.1-5Z" /></svg>
  if (priority === 'Medium') return <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5"><path d="M9.5 1 3 9h4l-.5 6L13 7H9l.5-6Z" /></svg>
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 2.5C7 2.5 3.2 5.4 3.2 10c0 2 1.4 3.5 3.4 3.5 4.6 0 6.9-4.6 6.9-11Z" /><path d="M2 14c2.2-3.4 4.8-5.8 8-7.4" /></svg>
}

function BellIcon() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6a4 4 0 0 0-8 0c0 4.7-2 4.7-2 6h12c0-1.3-2-1.3-2-6ZM6.5 14h3" /></svg>
}

function EditTaskForm({ task, editForm, updateEditForm, saveEditedTask, cancelEditingTask }) {
  const reward = deriveTaskReward(editForm)

  return (
    <div className="rounded-[1.4rem] bg-[linear-gradient(145deg,#151b2d,#101624)] p-4 shadow-[0_14px_38px_rgba(0,0,0,0.24)] ring-1 ring-inset ring-violet-400/16 sm:p-5">
      <p className="text-sm font-semibold text-violet-300">Edit mission</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="sr-only">Task title</span><input value={editForm.title} onChange={(event) => updateEditForm('title', event.target.value)} className="zatora-input" placeholder="Task title" /></label>
        <label><span className="sr-only">Category</span><input value={editForm.category} onChange={(event) => updateEditForm('category', event.target.value)} className="zatora-input" placeholder="Category" /></label>
        <label><span className="sr-only">Energy</span><select value={editForm.energy} onChange={(event) => updateEditForm('energy', event.target.value)} className="zatora-input"><option>Low</option><option>Medium</option><option>High</option><option>Creative</option></select></label>
        <label><span className="sr-only">Time estimate</span><select value={editForm.time} onChange={(event) => updateEditForm('time', event.target.value)} className="zatora-input">{['5 min', '10 min', '15 min', '20 min', '25 min', '30 min', '45 min', '60 min'].map((time) => <option key={time}>{time}</option>)}</select></label>
        <div className="flex min-h-12 items-center justify-between rounded-xl bg-violet-500/[0.08] px-3 text-sm ring-1 ring-inset ring-violet-400/15" aria-label={`Automatic reward: ${reward} XP`}><span className="text-white/50">Auto reward</span><span className="font-semibold text-violet-300">+{reward} XP</span></div>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-black/20 px-3 text-sm text-white/70 ring-1 ring-inset ring-white/10"><input type="checkbox" checked={editForm.recurring || false} onChange={(event) => updateEditForm('recurring', event.target.checked)} className="accent-violet-500" />Recurring task</label>
        {editForm.recurring && <label><span className="sr-only">Recurrence</span><select value={editForm.recurrence || ''} onChange={(event) => updateEditForm('recurrence', event.target.value)} className="zatora-input"><option value="">Choose recurrence</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => saveEditedTask(task)} className="min-h-11 rounded-xl bg-violet-500 px-4 text-sm font-bold text-white hover:bg-violet-400">Save changes</button>
        <button type="button" onClick={cancelEditingTask} className="min-h-11 rounded-xl bg-white/[0.07] px-4 text-sm font-semibold text-white/75 hover:bg-white/10">Cancel</button>
      </div>
    </div>
  )
}

export default function TaskItemV2({ task, editingTaskId, editForm, updateEditForm, saveEditedTask, cancelEditingTask, toggleTask, startEditingTask, deleteTask }) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const energy = energyStyles[task.energy] || energyStyles.Low
  const priority = deriveTaskPriority(task)
  const priorityStyle = priorityStyles[priority]
  const reward = Number(task.reward) || deriveTaskReward(task)

  function addToGoogleCalendar() {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMinutes(startDate.getMinutes() + (Number.parseInt(task.time, 10) || 30))
    const formatDate = (date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '')
    const url = new URL('https://calendar.google.com/calendar/render')
    url.searchParams.set('action', 'TEMPLATE')
    url.searchParams.set('text', task.title)
    url.searchParams.set('details', `Zatora task: ${task.category}`)
    url.searchParams.set('dates', `${formatDate(startDate)}/${formatDate(endDate)}`)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  if (editingTaskId === task.id) {
    return <EditTaskForm task={task} editForm={editForm} updateEditForm={updateEditForm} saveEditedTask={saveEditedTask} cancelEditingTask={cancelEditingTask} />
  }

  return (
    <article className={`relative overflow-hidden rounded-[1.35rem] bg-[linear-gradient(145deg,#131a2b,#0f1524)] shadow-[0_12px_34px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/[0.07] ${task.done ? 'opacity-65' : ''}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${priorityStyle.accent}`} aria-hidden="true" />
      <div className="grid grid-cols-[3.15rem_3.55rem_minmax(0,1fr)_3.25rem] items-center sm:grid-cols-[3.75rem_4.4rem_minmax(0,1fr)_5.5rem]">
        <button type="button" onClick={() => toggleTask(task)} className="grid h-full min-h-[7rem] place-items-center border-r border-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400" aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>
          <span className={`grid h-8 w-8 place-items-center rounded-full border-2 transition ${task.done ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/38 text-transparent hover:border-violet-400 hover:bg-violet-500/10'}`}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
          </span>
        </button>

        <span className={`mx-1 grid h-12 w-12 place-items-center rounded-2xl ${energy.surface} ${energy.text} ring-1 ring-inset ring-white/10 sm:h-14 sm:w-14`}><MissionIcon task={task} /></span>

        <div className="min-w-0 px-2 py-3 sm:px-3">
          <h3 className={`break-words text-[0.94rem] font-semibold leading-5 text-white sm:text-base ${task.done ? 'line-through text-white/40' : ''}`}>{task.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-white/48 sm:text-sm">
            <span className={energy.text}>{task.category || `${task.energy || 'Low'} Energy`}</span>
            {task.time && <><span aria-hidden="true">•</span><span>{task.time}</span></>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.66rem] font-medium ${priorityStyle.surface} ${priorityStyle.text}`}><PriorityIcon priority={priority} />{priority} Priority</span>
            {task.reminder_enabled && task.reminder_time && <span className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-violet-300/90"><BellIcon />{formatReminder(task.reminder_time)}</span>}
            {task.recurring && <span className="text-[0.68rem] text-white/38">↻ Recurring</span>}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 pr-1 sm:pr-2">
          <span className={`whitespace-nowrap text-[0.66rem] font-semibold sm:text-sm ${priorityStyle.text}`}>+{reward} XP</span>
          <button type="button" onClick={() => setActionsOpen((current) => !current)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label={`Actions for ${task.title}`} aria-expanded={actionsOpen}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`h-5 w-5 transition ${actionsOpen ? 'rotate-90 text-violet-300' : ''}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {actionsOpen && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-4 py-3 pl-[4rem] sm:pl-[5rem]">
          <button type="button" onClick={() => { startEditingTask(task); setActionsOpen(false) }} className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10">Edit</button>
          <button type="button" onClick={addToGoogleCalendar} className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10">Calendar</button>
          <button type="button" onClick={() => deleteTask(task)} className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20">Delete</button>
        </div>
      )}
    </article>
  )
}
