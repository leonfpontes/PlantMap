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
    <header className={cn('flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 flex-shrink-0', className)}>
      {showBack && (
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 text-base font-semibold text-gray-900">{title}</h1>
      {right && <div>{right}</div>}
    </header>
  )
}
