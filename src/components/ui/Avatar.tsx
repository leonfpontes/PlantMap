import Image from 'next/image'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : null

  return (
    <div className={cn('relative rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center overflow-hidden flex-shrink-0', sizes[size], className)}>
      {src ? (
        <Image src={src} alt={name || 'Avatar'} fill className="object-cover" />
      ) : initials ? (
        <span className="font-semibold text-green-700 dark:text-green-400">{initials}</span>
      ) : (
        <User className="h-1/2 w-1/2 text-green-600 dark:text-green-400" />
      )}
    </div>
  )
}
