export default function AICoachPage({
    coachInput,
    setCoachInput,
    coachResponse,
    coachStatus,
    getCoachResponse,
    addCoachTasksToToday,
    coachTasksAdded,
}) {
    return (
        <main className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
            <p className="mb-3 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                GPT-5 Mini Coach
            </p>

            <h2 className="text-3xl font-bold">AI Task Coach</h2>

            <p className="mt-2 text-slate-500">
                Dump what feels overwhelming. Zatora will turn it into three tiny next steps.
            </p>

            <form onSubmit={getCoachResponse} className="mt-6 space-y-4">
                <textarea
                    value={coachInput}
                    onChange={(event) => setCoachInput(event.target.value)}
                    rows={6}
                    placeholder="Example: I need to study, clean my room, apply for jobs, and I feel overwhelmed."
                    className="w-full rounded-3xl border border-slate-300 p-4 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                />

                <button
                    type="submit"
                    className="rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-700"
                >
                    Break It Down
                </button>
            </form>

            {coachStatus && (
                <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">
                    {coachStatus}
                </p>
            )}

            {coachResponse && (
                <section className="mt-6 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                    <h3 className="mb-3 text-lg font-bold text-indigo-900">
                        Your Coach's Plan
                    </h3>

                    {coachResponse.summary && (
                        <p className="rounded-2xl bg-white p-4 text-slate-700">
                            {coachResponse.summary}
                        </p>
                    )}

                    {coachResponse.tasks?.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <p className="font-bold text-indigo-900">
                                Tiny Next Steps
                            </p>

                            {coachResponse.tasks.map((task, index) => (
                                <div
                                    key={`${task.title}-${index}`}
                                    className="rounded-2xl bg-white p-4"
                                >
                                    <p className="font-semibold text-slate-900">
                                        {index + 1}. {task.title}
                                    </p>

                                    <p className="mt-2 text-sm text-slate-500">
                                        {task.energy} energy · {task.time} · {task.reward} XP
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {coachResponse.tasks?.length > 0 && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => addCoachTasksToToday(coachResponse.tasks)}
                                disabled={coachTasksAdded}
                                className={`rounded-2xl px-5 py-3 font-semibold text-white shadow-lg transition ${coachTasksAdded
                                        ? 'cursor-not-allowed bg-emerald-600'
                                        : 'bg-slate-900 hover:bg-slate-700'
                                    }`}
                            >
                                {coachTasksAdded ? 'Tasks Added to Today' : 'Add These Tasks to Today'}
                            </button>

                            {coachTasksAdded && (
                                <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                                    3 AI tasks added to Today.
                                </p>
                            )}
                        </div>
                    )}

                    {coachResponse.startHere && (
                        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                            <p className="text-sm font-bold text-emerald-700">
                                Start Here
                            </p>
                            <p className="mt-1 font-semibold text-emerald-950">
                                {coachResponse.startHere}
                            </p>
                        </div>
                    )}

                    {coachResponse.encouragement && (
                        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                            <p className="text-sm font-bold text-amber-700">
                                Encouragement
                            </p>
                            <p className="mt-1 font-semibold text-amber-950">
                                {coachResponse.encouragement}
                            </p>
                        </div>
                    )}
                </section>
            )}
        </main>
    )
}