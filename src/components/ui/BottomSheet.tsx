'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  /** Título exibido no cabeçalho. */
  title?: string
  /** Controla a visibilidade do sheet. */
  open: boolean
  /** Callback disparado ao fechar (clique no backdrop ou no botão X). */
  onClose: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Modal de rodapé (bottom sheet) reutilizável.
 * Fecha ao pressionar Escape ou clicar no backdrop.
 *
 * @example
 * <BottomSheet title="Compartilhar" open={open} onClose={() => setOpen(false)}>
 *   <p>Conteúdo</p>
 * </BottomSheet>
 */
export default function BottomSheet({
  title,
  open,
  onClose,
  children,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900',
          className
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  )
}
