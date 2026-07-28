import { cn } from '@/lib/utils'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
}

export default function MobileShell({ children, className }: MobileShellProps) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gray-100 dark:bg-black">
      <div className={cn('relative flex h-dvh w-full max-w-[430px] flex-col bg-white dark:bg-gray-950', className)}>
        {children}
      </div>
    </div>
  )
}
