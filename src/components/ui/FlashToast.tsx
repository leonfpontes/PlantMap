'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { takeFlash } from '@/lib/flash'

const VISIBLE_MS = 3500

/**
 * Mostra no topo a confirmação deixada por setFlash na tela anterior.
 * Confere a cada troca de rota; some sozinha ou com um toque.
 */
export default function FlashToast() {
  const pathname = usePathname()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const msg = takeFlash()
    if (!msg) return
    setMessage(msg)
    const t = setTimeout(() => setMessage(null), VISIBLE_MS)
    return () => clearTimeout(t)
  }, [pathname])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        type="button"
        role="status"
        onClick={() => setMessage(null)}
        className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl text-left bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-gray-900"
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400 dark:text-green-600" />
        {message}
      </button>
    </div>
  )
}
