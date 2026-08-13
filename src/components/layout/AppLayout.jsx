import BottomNavigation from './BottomNavigation'
import PageContainer from './PageContainer'

export default function AppLayout({
  children,
  topBar,
  activeMode,
  onNavigate,
  onQuickAdd,
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070c] text-white selection:bg-violet-500/40">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-700/12 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[30rem] h-[28rem] w-[28rem] rounded-full bg-blue-600/8 blur-[130px]" />
      </div>

      <PageContainer className="relative pb-32 sm:pb-36">
        {topBar}
        <main>{children}</main>
      </PageContainer>

      <BottomNavigation
        activeMode={activeMode}
        onNavigate={onNavigate}
        onQuickAdd={onQuickAdd}
      />
    </div>
  )
}
