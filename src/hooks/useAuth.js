import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function isRecoveryUrl() {
  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('mode') === 'reset-password'
}

function clearRecoveryUrl() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState({}, document.title, cleanUrl)
}

export function useAuth() {
  const [user, setUser] = useState(null)

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [authStatus, setAuthStatus] = useState(
    'Sign in to return to your Zatora progress.'
  )

  const [passwordRecoveryStatus, setPasswordRecoveryStatus] = useState(
    'Enter and confirm your new password.'
  )

  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isRecoveryUrl)

  useEffect(() => {
    let isMounted = true

    async function getCurrentSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) return

      if (error) {
        console.error('Session error:', error)
        setAuthStatus('Could not check login status.')
      }

      setUser(data?.session?.user || null)
      setIsAuthLoading(false)
    }

    getCurrentSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        setUser(session?.user || null)

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
          setPasswordRecoveryStatus(
            'Recovery link accepted. Enter and confirm your new password.'
          )
        }
      }
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function signUp() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthStatus('Enter an email and password first.')
      return
    }

    if (authPassword.length < 6) {
      setAuthStatus('Password must contain at least 6 characters.')
      return
    }

    setIsAuthSubmitting(true)
    setAuthStatus('Creating account...')

    const { error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
    })

    setIsAuthSubmitting(false)

    if (error) {
      console.error('Sign up error:', error)
      setAuthStatus(error.message)
      return
    }

    setAuthStatus(
      'Account created. Check your email if confirmation is required, then sign in.'
    )
  }

  async function signIn() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthStatus('Enter an email and password first.')
      return
    }

    setIsAuthSubmitting(true)
    setAuthStatus('Signing in...')

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    })

    setIsAuthSubmitting(false)

    if (error) {
      console.error('Sign in error:', error)
      setAuthStatus(error.message)
      return
    }

    setAuthEmail('')
    setAuthPassword('')
    setAuthStatus('Signed in.')
  }

  async function requestPasswordReset() {
    const email = authEmail.trim()

    if (!email) {
      setAuthStatus(
        'Enter your email address above, then select Forgot password.'
      )
      return
    }

    setIsAuthSubmitting(true)
    setAuthStatus('Sending password reset email...')

    const redirectTo = `${window.location.origin}/?mode=reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    setIsAuthSubmitting(false)

    if (error) {
      console.error('Password reset request error:', error)
      setAuthStatus(error.message)
      return
    }

    setAuthStatus(
      'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.'
    )
  }

  async function updatePassword() {

    if (!newPassword || !confirmNewPassword) {
      setPasswordRecoveryStatus(
        'Enter and confirm your new password first.'
      )
      return
    }

    if (newPassword.length < 6) {
      setPasswordRecoveryStatus(
        'Your new password must contain at least 6 characters.'
      )
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordRecoveryStatus('The two passwords do not match.')
      return
    }

    setIsAuthSubmitting(true)
    setPasswordRecoveryStatus('Updating password...')

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession()

    if (sessionError || !sessionData?.session) {
      console.error('Password recovery session error:', sessionError)
      setIsAuthSubmitting(false)
      setPasswordRecoveryStatus(
        'This recovery link is invalid or has expired. Request a new password reset email.'
      )
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      console.error('Password update error:', error)
      setIsAuthSubmitting(false)
      setPasswordRecoveryStatus(error.message)
      return
    }

    await supabase.auth.signOut()

    clearRecoveryUrl()

    setUser(null)
    setIsPasswordRecovery(false)
    setNewPassword('')
    setConfirmNewPassword('')
    setAuthPassword('')
    setIsAuthSubmitting(false)

    setAuthStatus(
      'Password updated successfully. Sign in with your new password.'
    )
  }

  async function cancelPasswordRecovery() {
    await supabase.auth.signOut()

    clearRecoveryUrl()

    setUser(null)
    setIsPasswordRecovery(false)
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordRecoveryStatus(
      'Enter and confirm your new password.'
    )
    setAuthStatus('Password reset canceled. You can sign in below.')
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      setAuthStatus('Could not sign out. Please try again.')
      return
    }

    setUser(null)
    setAuthStatus('Signed out.')
  }

  return {
    user,

    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,

    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,

    authStatus,
    passwordRecoveryStatus,

    isAuthLoading,
    isAuthSubmitting,
    isPasswordRecovery,

    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    cancelPasswordRecovery,
  }
}
