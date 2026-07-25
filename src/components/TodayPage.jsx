import DailyStats from './DailyStats'
import BulldogCompanion from './BulldogCompanion'
import HabitTracker from './HabitTracker'
import AITaskCoach from './AITaskCoach'
import CustomTaskForm from './CustomTaskForm'
import TaskCard from './TaskCard'
import MorningBriefCard from './MorningBriefCard'

export default function TodayPage(props) {
    return (
        <main className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="space-y-6 xl:col-span-2">

                <MorningBriefCard
                    plan={props.plan}
                    plannerLoading={props.plannerLoading}
                    plannerStatus={props.plannerStatus}
                    plannerError={props.plannerError}
                    onRefresh={() => props.loadDailyPlan('Balanced', true)}
                    onBuildMyDay={() => { }}
                />

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                            <h2 className="text-2xl font-bold">
                                Today's Dopamine Queue
                            </h2>

                            <p className="mt-1 text-slate-500">
                                Small tasks, visible progress, fast wins.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">

                            <button
                                onClick={() => props.setShowTaskForm(!props.showTaskForm)}
                                className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-slate-700"
                            >
                                {props.showTaskForm ? 'Close Form' : '+ Custom Task'}
                            </button>

                            <button
                                onClick={props.addTinyTask}
                                className="rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-700"
                            >
                                + Tiny Task
                            </button>

                        </div>

                    </div>

                    {props.showTaskForm && (
                        <CustomTaskForm
                            taskForm={props.taskForm}
                            updateTaskForm={props.updateTaskForm}
                            handleCreateCustomTask={props.handleCreateCustomTask}
                            setTaskForm={props.setTaskForm}
                            setShowTaskForm={props.setShowTaskForm}
                            emptyTaskForm={props.emptyTaskForm}
                        />
                    )}

                    <div className="mt-6 space-y-4">

                        {props.tasks.map((task) => (
                            <TaskCard
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
                        ))}

                    </div>

                </div>

            </section>

            <aside className="space-y-6">

                <DailyStats
                    completedToday={props.completedToday}
                    totalXP={props.totalXP}
                    activeTasks={props.activeTasks}
                    estimatedFocusMinutes={props.estimatedFocusMinutes}
                    nextTask={props.nextTask}
                />

                <BulldogCompanion
                    level={props.level}
                    xp={props.xp}
                    bulldogReaction={props.bulldogReaction}
                    setBulldogReaction={props.setBulldogReaction}
                    completedToday={props.completedToday}
                    completedPomodoros={props.completedPomodoros}
                    habits={props.habits}
                />

                <HabitTracker
                    habits={props.habits}
                    habitName={props.habitName}
                    setHabitName={props.setHabitName}
                    habitStatus={props.habitStatus}
                    habitStats={props.habitStats}
                    addHabit={props.addHabit}
                    toggleHabit={props.toggleHabit}
                    deleteHabit={props.deleteHabit}
                />

                <AITaskCoach
                    tasks={props.tasks}
                    habits={props.habits}
                />

            </aside>

        </main>
    )
}