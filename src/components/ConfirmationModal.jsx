import { useEffect, useRef } from 'react'

export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close confirmation"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="relative w-full max-w-md rounded-[1.6rem] border border-white/10 bg-[#151925] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-6"
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/12 text-rose-300">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
          </svg>
        </div>
        <h2 id="delete-dialog-title" className="mt-5 text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p id="delete-dialog-description" className="mt-2 break-words text-sm leading-6 text-white/55">
          {description}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-xl bg-rose-500 px-4 text-sm font-bold text-white transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
