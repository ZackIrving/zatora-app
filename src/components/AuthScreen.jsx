import adultBulldog from '../assets/bulldog/adult-bulldog.png'

export default function AuthScreen({
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
  function handlePasswordKeyDown(event) {
    if (event.key === 'Enter' && !isAuthSubmitting) signIn()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] p-4 text-white sm:p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-[-8rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute bottom-[-10rem] right-[-5rem] h-[32rem] w-[32rem] rounded-full bg-amber-500/10 blur-[130px]" />
      </div>

      <main className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0b0e15]/92 shadow-[0_35px_120px_rgba(0,0,0,0.55)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-full overflow-hidden border-r border-white/[0.07] bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,0.26),transparent_42%),linear-gradient(145deg,#121725,#080a10)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/[0.07] text-3xl font-black italic text-violet-400">Z</span>
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Zatora</span>
            </div>
            <p className="mt-12 max-w-md font-serif text-4xl leading-[1.12] tracking-[-0.035em] text-white">Build focus that feels natural, one small win at a time.</p>
          </div>

          <div className="relative z-10 mx-auto mt-6 h-[27rem] w-[27rem] max-w-full overflow-hidden rounded-full border border-white/10 bg-amber-300/[0.08] shadow-[0_0_90px_rgba(245,158,11,0.12)]">
            <img src={adultBulldog} alt="Franco, Zatora's English Bulldog mascot" className="h-full w-full scale-110 object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080a10]/45 via-transparent to-transparent" />
          </div>
          <p className="relative z-10 text-sm text-white/45">Meet Franco, your steady productivity companion.</p>
        </section>

        <section className="flex items-center p-5 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/[0.07] text-3xl font-black italic text-violet-400">Z</span>
                <div><p className="text-lg font-bold tracking-wide">Zatora</p><p className="text-xs text-white/40">Powered by Franco</p></div>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/75">Welcome back</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">Your day starts here.</h1>
            <p className="mt-4 text-sm leading-6 text-white/45">Sign in to sync your tasks, XP, habits, and progress across your devices.</p>

            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-white/65">Email</span>
                <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" disabled={isAuthSubmitting} className="zatora-input mt-2 min-h-14 rounded-2xl bg-black/25 px-4 disabled:cursor-not-allowed disabled:opacity-50" placeholder="you@example.com" />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-white/65">Password</span>
                <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} onKeyDown={handlePasswordKeyDown} autoComplete="current-password" disabled={isAuthSubmitting} className="zatora-input mt-2 min-h-14 rounded-2xl bg-black/25 px-4 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Use at least 6 characters" />
              </label>

              <div className="text-right">
                <button type="button" onClick={requestPasswordReset} disabled={isAuthSubmitting} className="text-sm font-semibold text-violet-300 transition hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-50">Forgot password?</button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={signIn} disabled={isAuthSubmitting} className="min-h-13 rounded-2xl bg-violet-500 px-5 font-bold text-white shadow-[0_12px_35px_rgba(124,58,237,0.28)] transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60">{isAuthSubmitting ? 'Please wait…' : 'Sign In'}</button>
              <button type="button" onClick={signUp} disabled={isAuthSubmitting} className="min-h-13 rounded-2xl border border-white/10 bg-white/[0.06] px-5 font-semibold text-white/80 transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">Create Account</button>
            </div>

            <p aria-live="polite" className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-sm leading-6 text-white/50">{authStatus?.replaceAll('FocusFlow', 'Zatora')}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
