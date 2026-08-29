export default function AuthForm({
  mode = 'signin',
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

  function handleSubmit(event) {
    event.preventDefault()
    if (isAuthSubmitting) return

    if (isAccountConversion) {
      signUp()
      return
    }

    signIn()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-white/70">Email</span>
          <input
            type="email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            autoComplete="email"
            disabled={isAuthSubmitting}
            className="zatora-input mt-2 min-h-14 rounded-2xl bg-black/25 px-4 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-white/70">Password</span>
          <input
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            autoComplete={isAccountConversion ? 'new-password' : 'current-password'}
            disabled={isAuthSubmitting}
            className="zatora-input mt-2 min-h-14 rounded-2xl bg-black/25 px-4 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Use at least 6 characters"
          />
        </label>

        <div className="text-right">
          <button
            type="button"
            onClick={requestPasswordReset}
            disabled={isAuthSubmitting}
            className="rounded-lg text-sm font-semibold text-violet-300 transition hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-1 gap-3 ${isAccountConversion ? 'sm:grid-cols-2' : ''}`}>
        <button
          type="submit"
          disabled={isAuthSubmitting}
          className="min-h-13 rounded-2xl bg-violet-500 px-5 font-bold text-white shadow-[0_12px_30px_rgba(124,58,237,0.22)] transition hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAuthSubmitting
            ? 'Please wait…'
            : isAccountConversion
              ? 'Create My Account'
              : 'Sign In'}
        </button>

        {isAccountConversion && (
          <button
            type="button"
            onClick={signIn}
            disabled={isAuthSubmitting}
            className="min-h-13 rounded-2xl border border-white/12 bg-white/[0.055] px-5 font-semibold text-white/82 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d111b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign In Instead
          </button>
        )}
      </div>

      <p
        aria-live="polite"
        aria-atomic="true"
        className="mt-5 rounded-2xl border border-white/[0.065] bg-white/[0.035] px-4 py-3.5 text-sm leading-6 text-white/52"
      >
        {authStatus}
      </p>
    </form>
  )
}
