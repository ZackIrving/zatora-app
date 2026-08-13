import { useState } from 'react'

export default function SettingsPage({
  displayName,
  onSaveDisplayName,
  notificationPermission,
  onEnableNotifications,
}) {
  const [name, setName] = useState(displayName || '')
  const [profileStatus, setProfileStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function saveDisplayName(event) {
    event.preventDefault()
    const nextName = name.trim()

    if (!nextName) {
      setProfileStatus('Enter a display name first.')
      return
    }

    setIsSaving(true)
    const status = await onSaveDisplayName(nextName)
    setProfileStatus(status)
    setIsSaving(false)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-4 text-white">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/75">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-white/45">Personalize how Zatora greets you and manages browser notifications.</p>
      </div>

      <section className="rounded-[1.55rem] border border-white/[0.07] bg-[#141925] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.24)] sm:p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-white/45">Your display name appears in your daily greeting. Your email stays private.</p>
        <form onSubmit={saveDisplayName} className="mt-5">
          <label className="block">
            <span className="text-sm font-medium text-white/70">Display Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="name" className="zatora-input mt-2" placeholder="What should Franco call you?" />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isSaving} className="min-h-11 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Saving…' : 'Save display name'}
            </button>
            {profileStatus && <p aria-live="polite" className="text-sm text-white/50">{profileStatus}</p>}
          </div>
        </form>
      </section>

      <section className="rounded-[1.55rem] border border-white/[0.07] bg-[#141925] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.24)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="mt-1 text-sm text-white/45">Browser permission: <span className="font-medium capitalize text-white/70">{notificationPermission}</span></p>
          </div>
          <button type="button" onClick={onEnableNotifications} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.1] hover:text-white">
            {notificationPermission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
          </button>
        </div>
      </section>
    </div>
  )
}
