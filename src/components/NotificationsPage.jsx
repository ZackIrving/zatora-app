export default function NotificationsPage({ onOpenSettings }) {
  return (
    <div className="mx-auto max-w-2xl pb-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/75">Inbox</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Notifications</h1>
      <section className="mt-5 rounded-[1.55rem] border border-white/[0.07] bg-[#141925] px-5 py-12 text-center shadow-[0_16px_45px_rgba(0,0,0,0.24)] sm:px-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-white/35">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h2 className="mt-5 text-lg font-semibold">You&apos;re all caught up</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">There are no notifications right now. Task reminders and Zatora updates will appear here.</p>
        <button type="button" onClick={onOpenSettings} className="mt-5 min-h-11 rounded-xl bg-white/[0.07] px-5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.11] hover:text-white">Notification Settings</button>
      </section>
    </div>
  )
}
