import AuthenticatedApp from './components/AuthenticatedApp'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import WelcomeExperience from './components/welcome/WelcomeExperience'
import { useAuth } from './hooks/useAuth'

export default function ADHDProductivityApp() {
  const auth = useAuth()

  if (auth.isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070c] p-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold">Zatora</h1>
          <p className="mt-2 text-white/45">Checking login status…</p>
        </div>
      </div>
    )
  }

  if (auth.isPasswordRecovery) {
    return (
      <ResetPasswordScreen
        newPassword={auth.newPassword}
        setNewPassword={auth.setNewPassword}
        confirmNewPassword={auth.confirmNewPassword}
        setConfirmNewPassword={auth.setConfirmNewPassword}
        passwordRecoveryStatus={auth.passwordRecoveryStatus}
        isAuthSubmitting={auth.isAuthSubmitting}
        updatePassword={auth.updatePassword}
        cancelPasswordRecovery={auth.cancelPasswordRecovery}
      />
    )
  }

  if (!auth.user) {
    const authProps = {
      authEmail: auth.authEmail,
      setAuthEmail: auth.setAuthEmail,
      authPassword: auth.authPassword,
      setAuthPassword: auth.setAuthPassword,
      authStatus: auth.authStatus,
      isAuthSubmitting: auth.isAuthSubmitting,
      signIn: auth.signIn,
      signUp: auth.signUp,
      requestPasswordReset: auth.requestPasswordReset,
    }

    return <WelcomeExperience authProps={authProps} />
  }

  return <AuthenticatedApp user={auth.user} signOut={auth.signOut} />
}
