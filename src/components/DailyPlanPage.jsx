import adultBulldog from '../assets/bulldog/adult-bulldog.png'

const textareaClassName =
  'mt-4 w-full resize-y rounded-2xl border bg-black/20 px-4 py-3.5 text-[16px] leading-6 text-white/90 outline-none transition placeholder:text-white/25 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/15'

function PlanSection({
  id,
  eyebrow,
  title,
  description,
  value,
  onChange,
  placeholder,
  className,
  eyebrowClassName,
  textareaClassName: sectionTextareaClassName,
  help,
}) {
  const descriptionId = `${id}-description`
  const helpId = `${id}-help`

  return (
    <section className={`rounded-[1.55rem] p-5 ring-1 ring-inset sm:p-6 ${className}`}>
      <p className={`text-[0.68rem] font-bold uppercase tracking-[0.18em] ${eyebrowClassName}`}>
        {eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
        <label htmlFor={id}>{title}</label>
      </h3>
      <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-white/48">
        {description}
      </p>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        aria-describedby={`${descriptionId} ${helpId}`}
        className={`${textareaClassName} ${sectionTextareaClassName}`}
        placeholder={placeholder}
      />
      <p id={helpId} className="mt-2 text-xs leading-5 text-white/34">
        {help}
      </p>
    </section>
  )
}

function ScopeGuide() {
  const steps = [
    { label: 'Focus', detail: 'Top 3', className: 'bg-violet-400' },
    { label: 'Essential', detail: 'Must', className: 'bg-violet-400/70' },
    { label: 'Helpful', detail: 'Should', className: 'bg-violet-400/42' },
    { label: 'Optional', detail: 'Could', className: 'bg-violet-400/20' },
  ]

  return (
    <section
      aria-labelledby="daily-plan-scope-title"
      className="rounded-[1.4rem] bg-white/[0.035] p-4 ring-1 ring-inset ring-white/[0.06] sm:p-5"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 id="daily-plan-scope-title" className="text-sm font-semibold text-white/78">
            Narrow the day
          </h3>
          <p className="mt-1 text-xs leading-5 text-white/38">
            Start with what matters. Let everything else earn its place.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-500/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-violet-300/75">
          Scope guide
        </span>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Planning hierarchy from most important to optional">
        {steps.map((step, index) => (
          <li key={step.label} className="min-w-0">
            <span className={`block h-1.5 rounded-full ${step.className}`} aria-hidden="true" />
            <span className="mt-2 block truncate text-[0.66rem] font-semibold text-white/65 sm:text-xs">
              {step.label}
            </span>
            <span className="mt-0.5 block truncate text-[0.62rem] text-white/28 sm:text-[0.7rem]">
              {index + 1}. {step.detail}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function FrancoPlanNote({ message }) {
  return (
    <aside
      aria-labelledby="franco-plan-note-title"
      className="relative isolate overflow-hidden rounded-[1.45rem] bg-[linear-gradient(135deg,rgba(38,31,67,0.96),rgba(16,21,35,0.98))] p-4 ring-1 ring-inset ring-violet-300/14 sm:p-5"
    >
      <div className="absolute -left-8 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-violet-500/12 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.25rem] bg-white/[0.045] ring-1 ring-inset ring-white/[0.07] sm:h-24 sm:w-24">
          <img
            src={adultBulldog}
            alt=""
            className="h-[112%] w-[112%] max-w-none object-cover object-[50%_38%]"
          />
        </div>
        <div className="min-w-0">
          <h3 id="franco-plan-note-title" className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300/75">
            From today&apos;s brief
          </h3>
          <blockquote className="mt-1.5 text-sm font-medium leading-6 text-white/78 sm:text-base">
            {message}
          </blockquote>
        </div>
      </div>
    </aside>
  )
}

export default function DailyPlanPage({
  dailyPlan,
  dailyPlanStatus,
  updateDailyPlan,
  saveDailyPlan,
  francoMessage,
  francoAvailable,
}) {
  const normalizedStatus = dailyPlanStatus.toLowerCase()
  const statusIsError = normalizedStatus.includes('could not')
  const statusIsSaving = normalizedStatus.includes('saving')

  return (
    <section aria-labelledby="daily-plan-title" className="space-y-5 pb-2 text-white sm:space-y-6">
      <header className="relative isolate overflow-hidden rounded-[1.65rem] bg-[radial-gradient(circle_at_88%_10%,rgba(124,58,237,0.18),transparent_34%),linear-gradient(145deg,#121829,#0d1320)] p-5 shadow-[0_20px_65px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-violet-300/12 sm:p-7">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/8 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/70">
            Plan with intention
          </p>
          <h2 id="daily-plan-title" className="mt-2 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
            Daily Plan
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/52 sm:text-base sm:leading-7">
            Build a realistic day around what matters most, not every possible thing you could do.
          </p>
        </div>
      </header>

      <ScopeGuide />

      {francoAvailable && francoMessage && <FrancoPlanNote message={francoMessage} />}

      <PlanSection
        id="daily-plan-top-priorities"
        eyebrow="Start here"
        title="Top 3 Priorities"
        description="These are the three things that matter most today."
        value={dailyPlan.top_priorities}
        onChange={(event) => updateDailyPlan('top_priorities', event.target.value)}
        placeholder={'1. Most important priority\n2. Second priority\n3. Third priority'}
        className="bg-[radial-gradient(circle_at_100%_0%,rgba(139,92,246,0.2),transparent_36%),linear-gradient(145deg,#1c1b33,#151928)] shadow-[0_18px_55px_rgba(0,0,0,0.34)] ring-violet-300/24"
        eyebrowClassName="text-violet-300"
        textareaClassName="min-h-[210px] border-violet-300/26 focus:border-violet-400/75"
        help="One priority per line works best. The plan remains flexible and freeform."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <PlanSection
          id="daily-plan-must-do"
          eyebrow="Essential"
          title="Must Do"
          description="Work that genuinely needs your attention today."
          value={dailyPlan.must_do}
          onChange={(event) => updateDailyPlan('must_do', event.target.value)}
          placeholder="What truly needs to happen today?"
          className="bg-[linear-gradient(145deg,#211c2b,#181b29)] shadow-[0_15px_42px_rgba(0,0,0,0.26)] ring-amber-300/18"
          eyebrowClassName="text-amber-300/80"
          textareaClassName="min-h-[180px] border-amber-200/20"
          help="Keep this list honest. Essential does not mean everything."
        />

        <PlanSection
          id="daily-plan-should-do"
          eyebrow="If there is capacity"
          title="Should Do"
          description="Useful work to consider after the essentials are handled."
          value={dailyPlan.should_do}
          onChange={(event) => updateDailyPlan('should_do', event.target.value)}
          placeholder="What would be useful, but can wait if needed?"
          className="bg-[linear-gradient(145deg,#1a2232,#161a28)] shadow-[0_15px_42px_rgba(0,0,0,0.24)] ring-blue-300/16"
          eyebrowClassName="text-blue-300/70"
          textareaClassName="min-h-[180px] border-blue-200/18"
          help="Only reach for these when the important work leaves room."
        />
      </div>

      <PlanSection
        id="daily-plan-could-do"
        eyebrow="Optional"
        title="Could Do"
        description="Bonus work for extra time or energy, not an expectation."
        value={dailyPlan.could_do}
        onChange={(event) => updateDailyPlan('could_do', event.target.value)}
        placeholder="What could be nice to do, with no pressure?"
        className="bg-[linear-gradient(145deg,#1b202b,#161c27)] shadow-[0_15px_42px_rgba(0,0,0,0.28)] ring-white/[0.16]"
        eyebrowClassName="text-white/52"
        textareaClassName="min-h-[150px] border-white/[0.2] bg-[#0c1119]"
        help="Leaving this unfinished is completely acceptable."
      />

      <section
        aria-label="Save daily plan"
        className="rounded-[1.45rem] bg-[#101625]/92 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-white/[0.07] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5"
      >
        <div className="min-h-6 min-w-0 sm:flex-1">
          {dailyPlanStatus ? (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                statusIsError
                  ? 'bg-rose-500/10 text-rose-200'
                  : statusIsSaving
                    ? 'bg-violet-500/10 text-violet-200'
                    : 'bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {dailyPlanStatus}
            </p>
          ) : (
            <p className="text-sm leading-6 text-white/38">
              Save when the day feels realistic enough to begin.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={saveDailyPlan}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(100deg,#7857f6_0%,#9257ee_55%,#654de8_100%)] px-6 text-sm font-bold text-white shadow-[0_14px_34px_rgba(124,58,237,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101625] sm:mt-0 sm:w-auto sm:min-w-40"
        >
          Save Plan
        </button>
      </section>
    </section>
  )
}
