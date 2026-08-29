import { useState } from 'react'
import AuthScreen from '../AuthScreen'
import { useGuestOnboarding } from '../../hooks/useGuestOnboarding'
import FrancoWelcomeVisual from './FrancoWelcomeVisual'

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

function GuestFoundation({ onReturnToWelcome, onSignIn }) {
  return (
    <div className="relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[#05070c] px-4 py-6 text-white sm:px-7 sm:py-10">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-16rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-600/12 blur-[120px]" />
        <div className="absolute bottom-[-15rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-amber-300/[0.07] blur-[130px]" />
      </div>

      <main className="relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-3xl flex-col justify-center">
        <WelcomeBrand />
        <section className="mt-7 rounded-[2rem] border border-white/[0.09] bg-[#0d111b]/94 p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:mt-10 sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/[0.1] text-2xl text-violet-200" aria-hidden="true">✓</div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/70">Guest space ready</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">Franco is ready to meet you.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/50 sm:text-base">Your private guest draft is ready. Franco’s introduction is the next part of the experience.</p>
          <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-white/35">No account, AI request, or cloud save has happened.</p>
          <div className="mx-auto mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            <button type="button" onClick={onReturnToWelcome} className="min-h-13 rounded-2xl border border-white/12 bg-white/[0.055] px-5 font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]">Back to Welcome</button>
            <button type="button" onClick={onSignIn} className="min-h-13 rounded-2xl bg-violet-500 px-5 font-bold text-white shadow-[0_12px_30px_rgba(124,58,237,0.22)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]">Sign In</button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function WelcomeExperience({ authProps }) {
  const guestOnboarding = useGuestOnboarding()
  const [mode, setMode] = useState(() => guestOnboarding.hasDraft ? 'resume' : 'welcome')

  function beginGuestExperience() {
    guestOnboarding.start()
    setMode('guest')
  }

  function continueGuestExperience() {
    const canResume = guestOnboarding.resume()
    setMode(canResume ? 'guest' : 'welcome')
  }

  function startOver() {
    guestOnboarding.reset()
    setMode('welcome')
  }

  function openSignIn() {
    guestOnboarding.setMigrationIntent(false)
    setMode('signin')
  }

  function returnFromSignIn() {
    setMode(guestOnboarding.hasDraft ? 'resume' : 'welcome')
  }

  if (mode === 'signin') {
    return <AuthScreen {...authProps} mode="signin" onBackToWelcome={returnFromSignIn} />
  }

  if (mode === 'guest') {
    return <GuestFoundation onReturnToWelcome={() => setMode('resume')} onSignIn={openSignIn} />
  }

  const isResume = mode === 'resume' && guestOnboarding.hasDraft

  return (
    <div className="relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[#05070c] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-17rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[120px] lg:left-[28%]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-amber-400/[0.08] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <main className="relative mx-auto grid min-h-screen min-h-[100svh] w-full max-w-7xl content-center gap-5 px-4 py-5 sm:gap-8 sm:px-7 sm:py-8 lg:grid-cols-[minmax(19rem,0.95fr)_minmax(25rem,1.05fr)] lg:items-center lg:gap-16 lg:px-10 lg:py-10 xl:gap-24">
        <section className="mx-auto w-full max-w-xl text-center lg:text-left">
          <WelcomeBrand />
          <div className="mt-3 sm:mt-5"><FrancoWelcomeVisual /></div>
        </section>

        <section className="mx-auto w-full max-w-xl lg:max-w-none">
          <div className="rounded-[1.85rem] border border-white/[0.09] bg-[#0d111b]/92 p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:rounded-[2.25rem] sm:p-9 lg:p-11 lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/60">{isResume ? 'Welcome back' : 'Your steady sidekick'}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-none tracking-[-0.045em] text-white sm:text-5xl xl:text-6xl">Meet Franco.</h1>
            <p className="mt-4 text-base leading-7 text-white/52 sm:text-lg sm:leading-8">Your companion for getting things done — one step at a time.</p>

            {isResume ? (
              <div className="mt-8 rounded-3xl border border-violet-300/12 bg-violet-400/[0.06] p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-white">Continue where you left off?</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">Your guest progress is still saved on this device.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={continueGuestExperience} className="min-h-14 rounded-2xl bg-violet-500 px-5 font-bold text-white shadow-[0_12px_30px_rgba(124,58,237,0.22)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]">Continue where you left off</button>
                  <button type="button" onClick={startOver} className="min-h-14 rounded-2xl border border-white/12 bg-white/[0.05] px-5 font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]">Start over</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={beginGuestExperience} className="mt-8 min-h-14 w-full rounded-2xl bg-violet-500 px-6 text-base font-bold text-white shadow-[0_16px_36px_rgba(124,58,237,0.25)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b] sm:w-auto sm:min-w-56">Get Started</button>
            )}

            <button type="button" onClick={openSignIn} className="mx-auto mt-6 block rounded-lg px-2 py-1 text-sm font-semibold text-white/55 transition hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b] lg:mx-0">
              Already have an account? <span className="text-violet-300">Sign in</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
