import { useEffect, useRef } from 'react'
import TaskItemV2 from './TaskItemV2'
import { deriveTaskReward } from './taskPresentation'

export default function TodayPlan(props) {
  function openTaskCreation() {
    props.setTaskSheetView('task')
    props.setShowTaskForm(true)
  }

  return (
    <section id="today-plan">
      <div className="mb-3 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/70 text-xs text-white" aria-hidden="true">✓</span>
          <h2 className="text-base font-semibold uppercase tracking-[0.04em] text-white sm:text-lg">Today&apos;s Plan</h2>
        </div>
        <button type="button" onClick={() => props.setActiveMode('Daily Plan')} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-white/48 transition hover:text-white/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
          See all <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {props.tasks.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white/[0.035] px-5 py-9 text-center ring-1 ring-inset ring-white/[0.05]">
            <p className="text-sm font-medium text-white/70">Your plan is clear.</p>
            <p className="mt-1 text-sm text-white/40">Add one small mission when you&apos;re ready.</p>
          </div>
        ) : (
          props.tasks.map((task) => (
            <TaskItemV2
              key={task.id || task.title}
              task={task}
              editingTaskId={props.editingTaskId}
              editForm={props.editForm}
              updateEditForm={props.updateEditForm}
              saveEditedTask={props.saveEditedTask}
              cancelEditingTask={props.cancelEditingTask}
              toggleTask={props.toggleTask}
              startEditingTask={props.startEditingTask}
              deleteTask={props.deleteTask}
            />
          ))
        )}
      </div>

      <button type="button" onClick={openTaskCreation} className="mt-2.5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-violet-400 transition hover:bg-violet-500/[0.08] hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
        <span className="text-xl" aria-hidden="true">＋</span> Add task
      </button>
    </section>
  )
}

function QuickActionIcon({ type }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', className: 'h-5 w-5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (type === 'brain-dump') return <svg {...common}><path d="M5 4h14v13H9l-4 3V4Z" /><path d="M8 8h8M8 12h6" /></svg>
  if (type === 'habit') return <svg {...common}><path d="M19 8a7 7 0 1 0 1 7" /><path d="M19 4v4h-4M8 11l2.5 2.5L16 8" /></svg>
  if (type === 'daily-plan') return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16M8 13h3M8 16h6" /></svg>
  return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
}

const quickActions = [
  { id: 'task', label: 'Task', description: 'Add a clear next step', tone: 'from-violet-500/20 to-indigo-500/10 text-violet-300' },
  { id: 'brain-dump', label: 'Brain Dump', description: 'Clear what is on your mind', tone: 'from-blue-500/20 to-cyan-500/10 text-blue-300' },
  { id: 'habit', label: 'Habit', description: 'Build a small daily rhythm', tone: 'from-emerald-500/20 to-teal-500/10 text-emerald-300' },
  { id: 'daily-plan', label: 'Daily Plan', description: 'Shape today around what matters', tone: 'from-amber-500/20 to-orange-500/10 text-amber-300' },
]

export function TaskCreationModal(props) {
  const { showTaskForm, setShowTaskForm, setActiveMode, onOpenHabits, addTinyTask, taskSheetView, setTaskSheetView } = props
  const titleInputRef = useRef(null)

  useEffect(() => {
    if (!showTaskForm) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [showTaskForm])

  if (!showTaskForm) return null

  function closeSheet() {
    setTaskSheetView('choices')
    setShowTaskForm(false)
  }

  function openTaskDetails() {
    setTaskSheetView('task')
    window.setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  function chooseAction(action) {
    if (action === 'task') openTaskDetails()
    if (action === 'brain-dump') {
      closeSheet()
      setActiveMode('Brain Dump')
    }
    if (action === 'habit') {
      closeSheet()
      onOpenHabits()
    }
    if (action === 'daily-plan') {
      closeSheet()
      setActiveMode('Daily Plan')
    }
  }

  async function submitTask(event) {
    await props.handleCreateCustomTask(event)
    if (props.taskForm.title.trim()) setTaskSheetView('choices')
  }

  function addResetTask() {
    addTinyTask()
    closeSheet()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="presentation" onKeyDown={(event) => { if (event.key === 'Escape') closeSheet() }}>
      <button type="button" onClick={closeSheet} className="absolute inset-0 bg-black/78 backdrop-blur-md" aria-label="Close Quick Add" />
      <div role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-[linear-gradient(155deg,#171d2f,#0d1320)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_30px_100px_rgba(0,0,0,0.72)] ring-1 ring-inset ring-white/10 sm:max-w-xl sm:rounded-[2rem] sm:p-6">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/16 sm:hidden" aria-hidden="true" />

        {taskSheetView === 'choices' ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/70">Quick Add</p>
                <h2 id="quick-add-title" className="mt-1 text-2xl font-semibold tracking-tight text-white">What do you want to add?</h2>
                <p className="mt-1 text-sm text-white/42">Pick one. You can add the details next.</p>
              </div>
              <button type="button" onClick={closeSheet} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.05] text-2xl text-white/45 hover:bg-white/[0.09] hover:text-white" aria-label="Close Quick Add">&times;</button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button key={action.id} type="button" onClick={() => chooseAction(action.id)} className="group min-h-[8rem] rounded-[1.3rem] bg-white/[0.035] p-4 text-left ring-1 ring-inset ring-white/[0.07] transition hover:-translate-y-0.5 hover:bg-white/[0.065] hover:ring-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${action.tone}`}><QuickActionIcon type={action.id} /></span>
                  <span className="mt-3 block text-sm font-semibold text-white/88">{action.label}</span>
                  <span className="mt-1 block text-xs leading-4 text-white/38">{action.description}</span>
                </button>
              ))}
            </div>

            <button type="button" onClick={addResetTask} className="mt-4 w-full rounded-xl px-3 py-3 text-sm font-medium text-white/42 transition hover:bg-white/[0.04] hover:text-violet-300">Need a quick win? Add a 5-minute reset</button>
          </>
        ) : (
          <TaskCreationForm {...props} titleInputRef={titleInputRef} onBack={() => setTaskSheetView('choices')} onClose={closeSheet} onSubmit={submitTask} />
        )}
      </div>
    </div>
  )
}

function TaskCreationForm({ taskForm, updateTaskForm, setTaskForm, emptyTaskForm, titleInputRef, onBack, onClose, onSubmit }) {
  const reward = deriveTaskReward(taskForm)

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-white/55 hover:bg-white/[0.06] hover:text-white" aria-label="Back to Quick Add choices"><span aria-hidden="true">‹</span> Back</button>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-2xl text-white/45 hover:bg-white/[0.09] hover:text-white" aria-label="Close task form">&times;</button>
      </div>
      <div className="mt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/70">New mission</p>
        <h2 id="quick-add-title" className="mt-1 text-2xl font-semibold tracking-tight text-white">Create a task</h2>
        <p className="mt-1 text-sm text-white/42">Keep it specific and easy to start.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="sr-only">Task title</span><input ref={titleInputRef} value={taskForm.title} onChange={(event) => updateTaskForm('title', event.target.value)} className="zatora-input" placeholder="What do you want to get done?" /></label>
        <label><span className="sr-only">Category</span><input value={taskForm.category} onChange={(event) => updateTaskForm('category', event.target.value)} className="zatora-input" placeholder="Category" /></label>
        <label><span className="sr-only">Energy</span><select value={taskForm.energy} onChange={(event) => updateTaskForm('energy', event.target.value)} className="zatora-input"><option>Low</option><option>Medium</option><option>High</option><option>Creative</option></select></label>
        <label><span className="sr-only">Time estimate</span><select value={taskForm.time} onChange={(event) => updateTaskForm('time', event.target.value)} className="zatora-input">{['5 min', '10 min', '15 min', '20 min', '25 min', '30 min', '45 min', '60 min'].map((time) => <option key={time}>{time}</option>)}</select></label>
        <div className="flex min-h-12 items-center justify-between rounded-xl bg-violet-500/[0.08] px-3 text-sm ring-1 ring-inset ring-violet-400/15" aria-label={`Automatic reward: ${reward} XP`}><span className="text-white/50">Auto reward</span><span className="font-semibold text-violet-300">+{reward} XP</span></div>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-black/20 px-3 text-sm text-white/70 ring-1 ring-inset ring-white/10"><input type="checkbox" checked={taskForm.recurring} onChange={(event) => updateTaskForm('recurring', event.target.checked)} className="accent-violet-500" />Recurring</label>
        {taskForm.recurring && <label><span className="sr-only">Recurrence</span><select value={taskForm.recurrence} onChange={(event) => updateTaskForm('recurrence', event.target.value)} className="zatora-input"><option value="">Choose recurrence</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>}
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-black/20 px-3 text-sm text-white/70 ring-1 ring-inset ring-white/10"><input type="checkbox" checked={taskForm.reminder_enabled} onChange={(event) => updateTaskForm('reminder_enabled', event.target.checked)} className="accent-violet-500" />Reminder</label>
        {taskForm.reminder_enabled && <label><span className="sr-only">Reminder time</span><input type="datetime-local" value={taskForm.reminder_time} onChange={(event) => updateTaskForm('reminder_time', event.target.value)} className="zatora-input" /></label>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => { setTaskForm(emptyTaskForm); onBack() }} className="min-h-12 rounded-xl bg-white/[0.06] px-4 text-sm font-semibold text-white/70 hover:bg-white/10">Cancel</button>
        <button type="submit" className="min-h-12 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(124,58,237,0.26)] hover:bg-violet-400">Save task</button>
      </div>
    </form>
  )
}
