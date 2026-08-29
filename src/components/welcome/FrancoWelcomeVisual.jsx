import temporaryTinyPuppyFranco from '../../assets/bulldog/puppy-stage-1.png'

// Final Tiny Puppy Franco and Den artwork will replace this isolated temporary asset.
export default function FrancoWelcomeVisual({ compact = false }) {
  return (
    <div className={`relative isolate mx-auto aspect-square w-full ${compact ? 'max-w-48 sm:max-w-64' : 'max-w-72 sm:max-w-sm lg:max-w-md'}`}>
      <div className="absolute inset-[12%] rounded-full bg-amber-300/15 blur-3xl" aria-hidden="true" />
      <div
        className="absolute inset-[6%] rounded-[32%] border border-amber-100/[0.08] bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.14),rgba(139,92,246,0.09)_48%,rgba(5,7,12,0.2)_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_80px_rgba(0,0,0,0.3)]"
        aria-hidden="true"
      />
      <img
        src={temporaryTinyPuppyFranco}
        alt="Franco, Zatora's English Bulldog companion"
        className="animate-bulldog-idle relative z-10 h-full w-full object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,0.38)]"
      />
    </div>
  )
}
