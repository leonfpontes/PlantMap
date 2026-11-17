'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  right?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, showBack = true, right, className }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className={cn('flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 flex-shrink-0 dark:border-gray-800 dark:bg-gray-950', className)}>
      {showBack && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      {right && <div>{right}</div>}
    </header>
  )
}
