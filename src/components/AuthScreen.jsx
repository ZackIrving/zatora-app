import AuthForm from './auth/AuthForm'
import FrancoWelcomeVisual from './welcome/FrancoWelcomeVisual'

export default function AuthScreen({
  mode = 'signin',
  onBackToWelcome,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authStatus,
  isAuthSubmitting,
  signIn,
  signUp,
  requestPasswordReset,
}) {
  const isAccountConversion = mode === 'account-conversion'

  return (
    <div className="relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[#05070c] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[120px] lg:left-[24%]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-amber-400/[0.07] blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <main className="relative mx-auto grid min-h-screen min-h-[100svh] w-full max-w-7xl content-center gap-6 px-4 py-5 sm:gap-8 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:items-center lg:gap-14 lg:px-10 lg:py-10 xl:gap-24">
        <section className="relative mx-auto w-full max-w-2xl lg:max-w-none">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/[0.08] text-xl font-black italic text-violet-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl">Z</span>
            <div>
              <p className="text-sm font-bold tracking-[0.28em] text-white/90 sm:text-base">ZATORA</p>
              <p className="mt-0.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-300/55 sm:text-xs">Focus. Grow. Become.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-4 sm:mt-7 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-7 lg:mt-8 lg:grid-cols-[minmax(18rem,0.95fr)_minmax(13rem,0.72fr)] lg:gap-6 xl:grid-cols-[minmax(21rem,1fr)_minmax(14rem,0.7fr)]">
            <FrancoWelcomeVisual compact />
            <div className="relative z-10">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-amber-200/60 sm:text-xs">Existing pack member</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold leading-none tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Welcome back.</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/52 sm:text-base sm:leading-7">Sign in and pick up where you left off with Franco.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg lg:max-w-none">
          <div className="rounded-[1.75rem] border border-white/[0.09] bg-[#0d111b]/94 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 lg:p-9 xl:p-10">
            {onBackToWelcome && (
              <button type="button" onClick={onBackToWelcome} className="mb-6 rounded-lg text-sm font-semibold text-white/55 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b]">
                <span aria-hidden="true">←</span> Back to Welcome
              </button>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/70">{isAccountConversion ? 'Keep what you started' : 'Sign in to Zatora'}</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{isAccountConversion ? 'Make it yours.' : 'Your next step is waiting.'}</h2>
              <p className="mt-3 text-sm leading-6 text-white/45">
                {isAccountConversion
                  ? 'Create an account to save your progress when account conversion arrives.'
                  : 'Use the account you already created to return to your tasks, habits, and progress.'}
              </p>
            </div>
            <div className="mt-7">
              <AuthForm
                mode={mode}
                authEmail={authEmail}
                setAuthEmail={setAuthEmail}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                authStatus={authStatus}
                isAuthSubmitting={isAuthSubmitting}
                signIn={signIn}
                signUp={signUp}
                requestPasswordReset={requestPasswordReset}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
