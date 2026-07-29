import { cn } from '@/lib/utils'
import Sidebar from './Sidebar'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
  /**
   * 'comfortable' (padrão): card centralizado, mais largo que o celular mas
   * ainda de leitura confortável (formulários, configurações, listas).
   * 'full': ocupa todo o espaço ao lado da sidebar — só o mapa usa isso hoje,
   * já que é o único conteúdo que se beneficia de mais espaço em vez de só
   * mais largura de coluna de texto.
   */
  desktopWidth?: 'comfortable' | 'full'
}

export default function MobileShell({ children, className, desktopWidth = 'comfortable' }: MobileShellProps) {
  return (
    <div className="flex min-h-dvh w-full bg-gray-100 dark:bg-black lg:bg-gray-50 lg:dark:bg-gray-950">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 items-center justify-center',
          desktopWidth === 'full' ? 'lg:p-0' : 'lg:p-10'
        )}
      >
        <div
          className={cn(
            'relative flex h-dvh w-full max-w-[430px] flex-col bg-white dark:bg-gray-950',
            desktopWidth === 'full'
              ? 'lg:max-w-none'
              : 'lg:h-[calc(100dvh-5rem)] lg:max-w-2xl lg:rounded-3xl lg:border lg:border-gray-100 lg:shadow-sm dark:lg:border-gray-800',
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
