import { useEffect, useRef, useState } from 'react'

const secondaryModes = ['Daily Plan', 'Brain Dump', 'Focus Timer', 'Progress', 'Weekly Review', 'Distraction Blocker', 'Settings']

function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5.5 w-5.5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function FrancoIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><circle cx="9" cy="11" r="1" fill="currentColor" /><circle cx="15" cy="11" r="1" fill="currentColor" /><path d="M9 15c2 1.4 4 1.4 6 0M6 7 3.5 5M18 7l2.5-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
}

export default function TopBar({ activeMode, onNavigate, onSignOut, syncStatus, notifications = [] }) {
  const [companionOpen, setCompanionOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const companionRef = useRef(null)
  const notificationsRef = useRef(null)

  useEffect(() => {
    function closePanels(event) {
      if (!companionRef.current?.contains(event.target)) setCompanionOpen(false)
      if (!notificationsRef.current?.contains(event.target)) setNotificationsOpen(false)
    }
    document.addEventListener('pointerdown', closePanels)
    return () => document.removeEventListener('pointerdown', closePanels)
  }, [])

  function navigate(mode) {
    onNavigate(mode)
    setCompanionOpen(false)
    setNotificationsOpen(false)
  }

  return (
    <header className="relative z-40 flex h-[4.7rem] items-center justify-between gap-3">
      <button type="button" onClick={() => navigate('Today')} className="rounded-xl bg-gradient-to-r from-violet-400 via-fuchsia-300 to-orange-300 bg-clip-text text-[1.35rem] font-bold tracking-[0.2em] text-transparent drop-shadow-[0_0_18px_rgba(192,132,252,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:text-[1.55rem]" aria-label="Go to Zatora Home">ZATORA</button>

      <div className="flex items-center gap-2">
        <div ref={notificationsRef} className="relative">
          <button type="button" onClick={() => { setNotificationsOpen((current) => !current); setCompanionOpen(false) }} className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#111726] text-white/76 shadow-[0_10px_28px_rgba(0,0,0,0.2)] ring-1 ring-inset ring-white/10 transition hover:bg-[#171e30] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Open notifications" aria-expanded={notificationsOpen}>
            <BellIcon />
            {notifications.length > 0 && <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-violet-500 ring-2 ring-[#111726]" />}
          </button>

          {notificationsOpen && (
            <div className="absolute right-[-8.8rem] top-13 w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-[#151925]/98 shadow-2xl ring-1 ring-inset ring-white/10 backdrop-blur-2xl sm:right-0">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5"><div><p className="text-sm font-semibold text-white">Notifications</p><p className="mt-0.5 text-xs text-white/40">Updates from Franco and reminders</p></div>{notifications.length > 0 && <span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs font-semibold text-violet-300">{notifications.length} new</span>}</div>
              {notifications.length === 0 ? (
                <div className="px-5 py-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-white/35"><BellIcon /></span><p className="mt-4 text-sm font-semibold text-white/80">You&apos;re all caught up</p><p className="mt-1 text-xs leading-5 text-white/40">Task reminders and Franco&apos;s updates will appear here.</p></div>
              ) : (
                <div className="max-h-72 overflow-y-auto p-2">{notifications.map((notification) => <div key={notification.id} className="rounded-xl px-3 py-3 hover:bg-white/[0.04]"><p className="text-sm font-medium text-white/80">{notification.title}</p>{notification.message && <p className="mt-1 text-xs leading-5 text-white/45">{notification.message}</p>}</div>)}</div>
              )}
              <div className="grid grid-cols-2 border-t border-white/[0.07] p-2"><button type="button" onClick={() => navigate('Notifications')} className="min-h-10 rounded-xl text-xs font-semibold text-violet-300 hover:bg-white/[0.05]">View All</button><button type="button" onClick={() => navigate('Settings')} className="min-h-10 rounded-xl text-xs font-semibold text-white/55 hover:bg-white/[0.05] hover:text-white/80">Notification Settings</button></div>
            </div>
          )}
        </div>

        <div ref={companionRef} className="relative">
          <button type="button" onClick={() => { setCompanionOpen((current) => !current); setNotificationsOpen(false) }} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#111726] px-3 text-sm font-semibold text-white/88 shadow-[0_10px_28px_rgba(0,0,0,0.2)] ring-1 ring-inset ring-white/10 transition hover:bg-[#171e30] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Open Companion menu" aria-expanded={companionOpen}>
            <span className="text-white/55"><FrancoIcon /></span><span>Companion</span>
          </button>

          {companionOpen && (
            <div className="absolute right-0 top-13 w-64 overflow-hidden rounded-2xl bg-[#151925]/98 p-2 shadow-2xl ring-1 ring-inset ring-white/10 backdrop-blur-2xl">
              <button type="button" onClick={() => navigate('AI Coach')} className="flex w-full items-center gap-3 rounded-xl bg-violet-500/12 px-3 py-3 text-left text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15"><FrancoIcon /></span><span><span className="block">Talk with Franco</span><span className="mt-0.5 block text-[11px] font-normal text-white/42">Your productivity companion</span></span></button>
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Explore Zatora</p>
              {secondaryModes.map((mode) => <button key={mode} type="button" onClick={() => navigate(mode)} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${activeMode === mode ? 'bg-violet-500/18 text-violet-200' : 'text-white/65 hover:bg-white/[0.05] hover:text-white'}`}>{mode}</button>)}
              <div className="my-2 h-px bg-white/[0.07]" />
              <p className="truncate px-3 pb-2 text-[11px] text-white/30" title={syncStatus}>{syncStatus}</p>
              <button type="button" onClick={onSignOut} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-300 hover:bg-rose-500/10">Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
