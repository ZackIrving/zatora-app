import adultBulldog from '../../assets/bulldog/adult-bulldog.png'

export default function FrancoHero({ greeting, userName, momentum }) {
  const hasMomentum = Number(momentum) > 0

  return (
    <section className="relative isolate grid min-h-[14.5rem] grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-center gap-1 overflow-visible pt-2 sm:min-h-[19rem] sm:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)] sm:gap-8 sm:pt-5">
      <div className="relative h-full min-h-[13.5rem] sm:min-h-[18rem]">
        <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22),rgba(124,58,237,0.13)_46%,transparent_70%)] blur-xl" />
        <div className="absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-fuchsia-500/12 blur-3xl sm:left-0" />
        <img
          src={adultBulldog}
          alt="Franco, your English Bulldog productivity companion"
          className="absolute inset-x-[-10%] bottom-0 h-[103%] w-[120%] max-w-none object-cover object-[50%_43%] [mask-image:linear-gradient(to_bottom,black_76%,transparent_100%)] sm:inset-x-[-8%] sm:h-[108%] sm:w-[116%]"
        />
      </div>

      <div className="relative z-10 py-7 pl-1 pr-1 sm:max-w-xl sm:py-10 sm:pr-8">
        <h1 className="text-[1.48rem] font-bold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
          {greeting}, {userName}. <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-3 max-w-md text-[0.86rem] leading-5 text-white/58 sm:mt-4 sm:text-xl sm:leading-8">
          {hasMomentum ? (
            <>You&apos;ve already got some momentum. Let&apos;s make the <span className="font-medium text-violet-400">next step</span> easy.</>
          ) : (
            <>Franco&apos;s here. Let&apos;s make the <span className="font-medium text-violet-400">first step</span> feel easy.</>
          )}
        </p>
      </div>
    </section>
  )
}
