function Icon({ name }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    focus: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></>,
    stats: <><path d="M5 20V12M12 20V4M19 20v-5" /><path d="M3 20h18" /></>,
    franco: <><circle cx="12" cy="12" r="9" /><circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" /><path d="M9 15c2 1.5 4 1.5 6 0M5.5 7 3 5M18.5 7 21 5" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const items = [
  { label: 'Home', mode: 'Today', icon: 'home' },
  { label: 'Focus', mode: 'Focus Timer', icon: 'focus' },
  { label: 'Progress', mode: 'Progress', icon: 'stats' },
  { label: 'Franco', mode: 'AI Coach', icon: 'franco' },
]

export default function BottomNavigation({ activeMode, onNavigate, onQuickAdd }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]" aria-label="Primary navigation">
      <div className="pointer-events-auto mx-auto grid max-w-[52rem] grid-cols-5 items-end rounded-[1.65rem] bg-[#101625]/94 px-2 pt-2 shadow-[0_-12px_50px_rgba(0,0,0,0.42)] ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
        {items.slice(0, 2).map((item) => <NavItem key={item.label} item={item} activeMode={activeMode} onNavigate={onNavigate} />)}
        <button type="button" onClick={onQuickAdd} className="group -mt-5 flex min-h-[4.9rem] flex-col items-center justify-start gap-1 text-[11px] font-medium text-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" aria-label="Quick Add">
          <span className="grid h-[4.25rem] w-[4.25rem] place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 via-violet-500 to-indigo-600 text-white shadow-[0_10px_36px_rgba(124,58,237,0.55)] ring-4 ring-[#101625] transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-9 w-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </button>
        {items.slice(2).map((item) => <NavItem key={item.label} item={item} activeMode={activeMode} onNavigate={onNavigate} />)}
      </div>
    </nav>
  )
}

function NavItem({ item, activeMode, onNavigate }) {
  const isActive = activeMode === item.mode
  return (
    <button type="button" onClick={() => onNavigate(item.mode)} className={`flex min-h-[4.7rem] flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[11px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:text-xs ${isActive ? 'bg-violet-500/10 text-violet-300' : 'text-white/48 hover:bg-white/[0.035] hover:text-white/78'}`} aria-current={isActive ? 'page' : undefined}>
      <Icon name={item.icon} />
      <span>{item.label}</span>
    </button>
  )
}
