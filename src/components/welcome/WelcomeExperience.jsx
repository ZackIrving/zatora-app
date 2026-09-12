import { useState } from 'react'
import AuthScreen from '../AuthScreen'
import {
  MAX_GUEST_NAME_LENGTH,
  MAX_GUEST_TASK_LENGTH,
  isValidGuestName,
  isValidGuestTask,
  isValidSupportNeed,
  normalizeGuestName,
  normalizeGuestTask,
} from '../../hooks/guestOnboardingState'
import FrancoWelcomeVisual from './FrancoWelcomeVisual'
import { getFirstTaskPlaceholder } from './firstTaskPlaceholder'

const SUPPORT_OPTIONS = [
  { value: 'getting_started', label: 'Getting started' },
  { value: 'staying_focused', label: 'Staying focused' },
  { value: 'keeping_up', label: 'Keeping up with everything' },
  { value: 'consistency', label: 'Building consistency' },
  { value: 'everything', label: 'Honestly, a little of everything' },
]

const SUPPORT_ACKNOWLEDGEMENTS = {
  getting_started: "We'll make the first move small.",
  staying_focused: "We'll clear some room for one thing.",
  keeping_up: "That's a lot to carry. We'll sort out what matters now.",
  consistency: "We'll build something steady—not perfect.",
  everything: 'Fair. One thing at a time.',
}

const primaryButtonClass = 'min-h-14 rounded-2xl bg-violet-500 px-6 text-base font-bold text-white shadow-[0_16px_36px_rgba(124,58,237,0.25)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]'
const quietButtonClass = 'inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-white/50 transition hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]'

function WelcomeBrand() {
  return (
    <div className="flex items-center justify-center gap-3 lg:justify-start">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] text-2xl font-black italic text-violet-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-12 sm:w-12">Z</span>
      <div>
        <p className="text-sm font-bold tracking-[0.28em] text-white/90 sm:text-base">ZATORA</p>
        <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-violet-300/55 sm:text-xs">Focus. Grow. Become.</p>
      </div>
    </div>
  )
}

function ExperienceFrame({ children }) {
  return (
    <div className="relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[#05070c] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-17rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[120px] lg:left-[28%]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-amber-400/[0.08] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <main className="relative mx-auto grid min-h-screen min-h-[100svh] w-full max-w-7xl content-center gap-3 px-4 py-4 sm:gap-5 sm:px-7 sm:py-7 lg:grid-cols-[minmax(19rem,0.92fr)_minmax(25rem,1.08fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-10 xl:gap-14">
        <section className="mx-auto w-full max-w-xl text-center lg:text-left">
          <WelcomeBrand />
          <div className="mx-auto mt-1 w-48 sm:mt-2 sm:w-64 lg:w-full">
            <FrancoWelcomeVisual />
          </div>
        </section>
        {children}
      </main>
    </div>
  )
}

function ConversationSurface({ sceneKey, children }) {
  return (
    <section className="mx-auto w-full max-w-xl lg:max-w-none">
      <div className="flex min-h-[22rem] items-center overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#0d111b]/88 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:min-h-96 sm:rounded-[2rem] sm:p-8 lg:min-h-[30rem] lg:p-10">
        <div key={sceneKey} className="animate-conversation-enter w-full">
          {children}
        </div>
      </div>
    </section>
  )
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={`-ml-2 mb-4 ${quietButtonClass}`}>
      <span aria-hidden="true">←</span>&nbsp; Back
    </button>
  )
}

function OnboardingFlow({ guestOnboarding, onReturnToWelcome }) {
  const step = guestOnboarding.draft?.step || 'name'
  const firstTaskPlaceholder = getFirstTaskPlaceholder(
    guestOnboarding.draft?.supportNeed
  )
  const [name, setName] = useState(guestOnboarding.draft?.name || '')
  const [firstTask, setFirstTask] = useState(
    guestOnboarding.draft?.firstTask || ''
  )
  const [validationMessage, setValidationMessage] = useState('')

  function submitName(event) {
    event.preventDefault()
    const nextName = normalizeGuestName(name)

    if (!isValidGuestName(nextName)) {
      setValidationMessage(
        nextName
          ? `Keep your name to ${MAX_GUEST_NAME_LENGTH} characters or fewer.`
          : 'Tell Franco what he should call you.'
      )
      return
    }

    setName(nextName)
    setValidationMessage('')
    guestOnboarding.transitionTo('support', { name: nextName })
  }

  function chooseSupportNeed(supportNeed) {
    if (!isValidSupportNeed(supportNeed)) return
    guestOnboarding.transitionTo('handoff', { supportNeed })
  }

  function submitFirstTask(event) {
    event.preventDefault()
    const nextTask = normalizeGuestTask(firstTask)

    if (!isValidGuestTask(nextTask)) {
      setValidationMessage(
        nextTask
          ? `Keep it to ${MAX_GUEST_TASK_LENGTH} characters or fewer.`
          : 'Tell Franco what you have been putting off.'
      )
      return
    }

    setFirstTask(nextTask)
    setValidationMessage('')
    guestOnboarding.transitionTo('simplify', { firstTask: nextTask })
  }

  function backFromName() {
    if (step === 'name') guestOnboarding.transitionTo('intro')
    onReturnToWelcome()
  }

  if (step === 'simplify') {
    return (
      <div>
        <BackButton onClick={() => guestOnboarding.transitionTo('task')} />
        <div aria-live="polite" aria-atomic="true">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            Got it.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/72 sm:text-xl">
            Next, I&apos;m going to help make that smaller.
          </p>
        </div>
        <p className="mt-7 border-l-2 border-amber-200/20 pl-4 text-sm leading-6 text-amber-100/55">
          Current Sprint 12C boundary: your task is saved locally. No AI request has run.
        </p>
      </div>
    )
  }

  if (step === 'task') {
    return (
      <div>
        <BackButton onClick={() => guestOnboarding.transitionTo('handoff')} />
        <div aria-live="polite" aria-atomic="true">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            What&apos;s one thing you&apos;ve been putting off?
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
            Don&apos;t overthink it. Just give me the thing that&apos;s been hanging around in your head.
          </p>
        </div>

        <form onSubmit={submitFirstTask} className="mt-6">
          <label className="block">
            <span className="text-sm font-medium text-white/70">
              The thing I&apos;ve been putting off
            </span>
            <input
              value={firstTask}
              onChange={(event) => {
                setFirstTask(event.target.value)
                setValidationMessage('')
              }}
              maxLength={MAX_GUEST_TASK_LENGTH}
              autoFocus
              className="zatora-input mt-2 min-h-14 rounded-2xl bg-black/25 px-4"
              placeholder={firstTaskPlaceholder}
            />
          </label>
          <div className="mt-2 flex items-start justify-between gap-4 text-xs">
            <p className="min-h-5 text-rose-200/85" aria-live="polite">
              {validationMessage}
            </p>
            <p className="shrink-0 text-white/25" aria-label={`${firstTask.length} of ${MAX_GUEST_TASK_LENGTH} characters used`}>
              {firstTask.length}/{MAX_GUEST_TASK_LENGTH}
            </p>
          </div>
          <button type="submit" className={`mt-4 w-full sm:w-auto sm:min-w-48 ${primaryButtonClass}`}>
            Help me start
          </button>
        </form>
      </div>
    )
  }

  if (step === 'handoff') {
    return (
      <div>
        <BackButton onClick={() => guestOnboarding.transitionTo('support')} />
        <div aria-live="polite" aria-atomic="true">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            Got it, {guestOnboarding.draft.name}.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/68 sm:text-xl">
            {SUPPORT_ACKNOWLEDGEMENTS[guestOnboarding.draft.supportNeed]}
          </p>
          <p className="mt-5 text-lg font-semibold leading-8 text-white/90 sm:text-xl">
            Let&apos;s make something easier right now.
          </p>
        </div>
        <button
          type="button"
          onClick={() => guestOnboarding.transitionTo('task')}
          className={`mt-7 w-full sm:w-auto sm:min-w-48 ${primaryButtonClass}`}
        >
          Let&apos;s do it
        </button>
      </div>
    )
  }

  if (step === 'support') {
    return (
      <div>
        <BackButton onClick={() => guestOnboarding.transitionTo('name')} />
        <div aria-live="polite" aria-atomic="true">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
            Nice to meet you, {guestOnboarding.draft.name}.
          </h1>
          <p className="mt-4 text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
            What would make things feel a little easier right now?
          </p>
        </div>

        <fieldset className="mt-7">
          <legend className="sr-only">Tell Franco what would make things feel easier</legend>
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            {SUPPORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => chooseSupportNeed(option.value)}
                className="group min-h-13 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-white/72 transition hover:border-violet-300/35 hover:bg-violet-400/[0.10] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]"
              >
                <span className="mr-2 text-violet-300/55 transition group-hover:text-violet-200" aria-hidden="true">→</span>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    )
  }

  return (
    <div>
      <BackButton onClick={backFromName} />
      <div aria-live="polite" aria-atomic="true">
        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
          Hey—I&apos;m Franco.
        </h1>
        <p className="mt-4 text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
          We&apos;ll take things one small step at a time.
        </p>
        <p className="mt-5 text-lg font-semibold leading-8 text-white/90 sm:text-xl">
          What should I call you?
        </p>
      </div>

      <form onSubmit={submitName} className="mt-6">
        <label className="block">
          <span className="text-sm font-medium text-white/70">You can call me</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setValidationMessage('')
            }}
            maxLength={MAX_GUEST_NAME_LENGTH}
            autoComplete="name"
            autoFocus
            className="zatora-input mt-2 min-h-14 rounded-2xl bg-black/25 px-4"
            placeholder="Your name"
          />
        </label>
        <div className="mt-2 flex items-start justify-between gap-4 text-xs">
          <p className="min-h-5 text-rose-200/85" aria-live="polite">
            {validationMessage}
          </p>
          <p className="shrink-0 text-white/25" aria-label={`${name.length} of ${MAX_GUEST_NAME_LENGTH} characters used`}>
            {name.length}/{MAX_GUEST_NAME_LENGTH}
          </p>
        </div>
        <button type="submit" className={`mt-4 w-full sm:w-auto sm:min-w-48 ${primaryButtonClass}`}>
          That&apos;s me
        </button>
      </form>
    </div>
  )
}

export default function WelcomeExperience({ authProps, guestOnboarding }) {
  const [mode, setMode] = useState(() => (
    guestOnboarding.hasDraft ? 'resume' : 'welcome'
  ))

  function beginGuestExperience() {
    guestOnboarding.start()
    guestOnboarding.transitionTo('name')
    setMode('guest')
  }

  function continueGuestExperience() {
    const canResume = guestOnboarding.resume()

    if (canResume && guestOnboarding.draft?.step === 'intro') {
      guestOnboarding.transitionTo('name')
    }

    setMode(canResume ? 'guest' : 'welcome')
  }

  function startOver() {
    guestOnboarding.startOver()
    setMode('welcome')
  }

  function returnFromSignIn() {
    setMode(guestOnboarding.hasDraft ? 'resume' : 'welcome')
  }

  if (mode === 'signin') {
    return (
      <AuthScreen
        {...authProps}
        mode="signin"
        onBackToWelcome={returnFromSignIn}
      />
    )
  }

  const isResume = mode === 'resume' && guestOnboarding.hasDraft
  const sceneKey = mode === 'guest'
    ? `guest-${guestOnboarding.draft?.step || 'name'}`
    : isResume ? 'resume' : 'welcome'

  return (
    <ExperienceFrame>
      <ConversationSurface sceneKey={sceneKey}>
        {mode === 'guest' ? (
          <OnboardingFlow
            guestOnboarding={guestOnboarding}
            onReturnToWelcome={() => setMode('welcome')}
          />
        ) : isResume ? (
          <div>
            <div aria-live="polite" aria-atomic="true">
              <h1 className="font-serif text-4xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">
                Welcome back{guestOnboarding.draft?.name ? `, ${guestOnboarding.draft.name}` : ''}.
              </h1>
              <p className="mt-4 text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
                Franco saved your spot.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={continueGuestExperience} className={`w-full sm:w-auto sm:min-w-48 ${primaryButtonClass}`}>
                Keep going
              </button>
              <button type="button" onClick={startOver} className={`${quietButtonClass} justify-center sm:justify-start`}>
                Start over
              </button>
            </div>
            <button type="button" onClick={() => setMode('signin')} className="mt-6 min-h-11 rounded-lg px-2 text-sm font-semibold text-white/50 transition hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]">
              Already have an account? <span className="text-violet-300">Sign in</span>
            </button>
          </div>
        ) : (
          <div>
            <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.045em] text-white sm:text-5xl xl:text-6xl">
              Meet Franco.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
              Your steady sidekick for making the next thing feel lighter.
            </p>
            <button type="button" onClick={beginGuestExperience} className={`mt-8 w-full sm:w-auto sm:min-w-48 ${primaryButtonClass}`}>
              Say hello
            </button>
            <button type="button" onClick={() => setMode('signin')} className="mt-6 min-h-11 w-full rounded-lg px-2 text-sm font-semibold text-white/50 transition hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b] sm:w-auto">
              Already have an account? <span className="text-violet-300">Sign in</span>
            </button>
          </div>
        )}
      </ConversationSurface>
    </ExperienceFrame>
  )
}
