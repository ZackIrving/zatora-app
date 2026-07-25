import BuddyGreeting from './BuddyGreeting'
import PriorityList from './PriorityList'

export default function MorningBriefCard({
    plan,
    plannerLoading,
    plannerStatus,
    plannerError,
    onRefresh,
    onBuildMyDay,
}) {
    if (plannerLoading) {
        return (
            <div className="animate-pulse rounded-3xl border bg-white p-6 shadow-sm">

                <div className="h-8 w-56 rounded bg-slate-200" />

                <div className="mt-5 space-y-3">

                    <div className="h-4 w-full rounded bg-slate-200" />
                    <div className="h-4 w-5/6 rounded bg-slate-200" />
                    <div className="h-4 w-4/6 rounded bg-slate-200" />

                </div>

                <div className="mt-8 space-y-4">

                    <div className="h-16 rounded-2xl bg-slate-200" />
                    <div className="h-16 rounded-2xl bg-slate-200" />
                    <div className="h-16 rounded-2xl bg-slate-200" />

                </div>

                <p className="mt-6 text-sm text-gray-500">
                    🐶 {plannerStatus}
                </p>

            </div>
        )
    }

    if (plannerError) {
        return (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">
                    🐶
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-900">
                    Morning Brief Unavailable
                </h2>

                <p className="mt-2 text-slate-600">
                    {plannerError}
                </p>

                <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                >
                    Try Again
                </button>

            </div>
        )
    }

    if (!plan) {
        return (
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                    🐶 Morning Brief
                </h2>

                <p className="mt-2 text-gray-500">
                    No plan available yet.
                </p>

                <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
                >
                    Generate Plan
                </button>
            </div>
        )
    }

    return (
        <div className="rounded-3xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg">

            <BuddyGreeting
                greeting={plan.greeting}
                summary={plan.summary}
                mood={plan.mood}
            />

            <PriorityList
                priorities={plan.priorities}
            />

            <div className="mt-6 flex gap-3">

                <button
                    type="button"
                    onClick={onBuildMyDay}
                    className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
                >
                    Build My Day
                </button>

                <button
                    type="button"
                    onClick={onRefresh}
                    className="rounded-xl border px-5 py-3 transition hover:bg-white"
                >
                    Refresh Plan
                </button>

            </div>

        </div>
    )
}