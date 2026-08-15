export default function ResetPasswordScreen({
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  passwordRecoveryStatus,
  isAuthSubmitting,
  updatePassword,
  cancelPasswordRecovery,
}) {
  function handleConfirmPasswordKeyDown(event) {
    if (event.key === 'Enter' && !isAuthSubmitting) {
      updatePassword()
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto flex min-h-[90vh] max-w-xl items-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <p className="mb-3 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
            Account Recovery
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Reset your password
          </h1>

          <p className="mt-3 text-slate-600">
            Choose a new password for your Zatora account.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                New password
              </span>

              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                disabled={isAuthSubmitting}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Use at least 6 characters"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Confirm new password
              </span>

              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) =>
                  setConfirmNewPassword(event.target.value)
                }
                onKeyDown={handleConfirmPasswordKeyDown}
                autoComplete="new-password"
                disabled={isAuthSubmitting}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Enter the same password again"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={updatePassword}
            disabled={isAuthSubmitting}
            className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-4 font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAuthSubmitting ? 'Updating password...' : 'Update Password'}
          </button>

          <button
            type="button"
            onClick={cancelPasswordRecovery}
            disabled={isAuthSubmitting}
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Return to Sign In
          </button>

          <p
            aria-live="polite"
            className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm font-medium text-slate-700"
          >
            {passwordRecoveryStatus}
          </p>
        </div>
      </div>
    </div>
  )
}