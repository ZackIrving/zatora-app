import { useEffect, useMemo, useState } from 'react'
import BulldogAvatar from './BulldogAvatar'

export default function BulldogCompanion({ level, xp, bulldogReaction, setBulldogReaction, completedToday, completedPomodoros, habits, }) {
    const [isExcited, setIsExcited] = useState(false)
    const [message, setMessage] = useState('Tap me when you need a tiny boost.')
    const [showSparkle, setShowSparkle] = useState(false)

    const encouragements = [
        'One tiny step counts.',
        'You are building momentum.',
        'Nice work showing up today.',
        'Small wins still count.',
        'Let’s do the next easy thing.',
    ]

    const growthStage = useMemo(() => {
        if (xp >= 700) return 'Adult Bulldog'
        if (xp >= 300) return 'Teen Bulldog'
        if (xp >= 100) return 'Curious Puppy'
        return 'Tiny Puppy'
    }, [xp])

    const completedHabitsToday = habits.filter(
        (habit) => habit.completed_today
    ).length

    const happiness = Math.min(
        100,
        completedToday * 15 + completedHabitsToday * 20
    )

    const focus = Math.min(100, completedPomodoros * 10)

    const bond = Math.min(100, level * 15)

    const unlockedCosmetic = level >= 2 ? 'red_collar' : null

    const selectedBreed = 'English Bulldog'

    useEffect(() => {
        if (!bulldogReaction) return

        setMessage(bulldogReaction.message)
        setIsExcited(true)
        setShowSparkle(true)

        const excitementTimer = setTimeout(() => {
            setIsExcited(false)
        }, 900)

        const sparkleTimer = setTimeout(() => {
            setShowSparkle(false)
            setBulldogReaction(null)
        }, 1500)

        return () => {
            clearTimeout(excitementTimer)
            clearTimeout(sparkleTimer)
        }
    }, [bulldogReaction, setBulldogReaction])

    function handleBulldogClick() {
        const randomMessage =
            encouragements[Math.floor(Math.random() * encouragements.length)]

        setMessage(randomMessage)
        setIsExcited(true)
        setShowSparkle(true)

        setTimeout(() => {
            setIsExcited(false)
        }, 700)

        setTimeout(() => {
            setShowSparkle(false)
        }, 1200)
    }

    return (
        <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-5 shadow-lg sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                    type="button"
                    onClick={handleBulldogClick}
                    className={`relative flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] bg-white shadow-inner transition hover:scale-105 ${isExcited ? 'animate-bounce' : ''
                        }`}
                    aria-label="Interact with bulldog companion"
                >
                    <BulldogAvatar isExcited={isExcited} growthStage={growthStage} cosmetic={unlockedCosmetic} />
                    {showSparkle && (
                        <div className="pointer-events-none absolute -right-2 -top-2 text-3xl animate-bounce">
                            ✨
                        </div>
                    )}
                </button>

                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-700">
                        Zatora Companion
                    </p>

                    <h2 className="text-2xl font-bold text-amber-950">
                        {selectedBreed}
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-amber-800">
                        Growth Stage: {growthStage}
                    </p>

                    <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-medium text-amber-800 shadow-sm">
                        “{message}”
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-amber-700">
                                Bond
                            </p>
                            <p className="text-xl font-bold text-amber-950">
                                {bond}%
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-amber-700">
                                Happiness
                            </p>
                            <p className="text-xl font-bold text-amber-950">
                                {happiness}%
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-amber-700">
                                Focus
                            </p>
                            <p className="text-xl font-bold text-amber-950">
                                {focus}%
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-amber-700">
                                Growth XP
                            </p>
                            <p className="text-xl font-bold text-amber-950">
                                {xp} XP
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3">
                        <p className="text-xs font-semibold text-amber-700">
                            Cosmetic
                        </p>

                        <p className="text-sm font-bold text-amber-950">
                            {unlockedCosmetic
                                ? 'Red Collar Unlocked'
                                : 'Reach Level 2 to unlock collar'}
                        </p>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3">
                        <p className="text-xs font-semibold text-amber-700">
                            Breed Collection
                        </p>

                        <p className="text-sm font-bold text-amber-950">
                            English Bulldog unlocked
                        </p>

                        <p className="mt-1 text-xs text-amber-700">
                            More breeds will unlock as Zatora grows.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}