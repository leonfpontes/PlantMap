import type { UseFormRegisterReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface ChoiceChipsProps {
  /** Título do grupo, lido também pelo leitor de tela. */
  legend: string
  options: { value: string; label: string; color?: string }[]
  registration: UseFormRegisterReturn
  /** Quantas colunas no celular. */
  columns?: 2 | 4
}

/**
 * Escolha única em botões grandes, no lugar de um <select>.
 *
 * Com 4 opções curtas, ver tudo de uma vez e tocar uma vez é mais rápido que
 * abrir uma lista nativa, e o alvo de toque é maior. Por baixo continuam
 * sendo radios de verdade: o formulário, o teclado e o leitor de tela
 * funcionam como sempre. `color` mostra a bolinha com a mesma cor do aro do
 * pin no mapa, pra pessoa associar uma coisa à outra.
 */
export default function ChoiceChips({ legend, options, registration, columns = 4 }: ChoiceChipsProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{legend}</legend>
      <div className={cn('grid gap-2', columns === 4 ? 'grid-cols-2 min-[380px]:grid-cols-4' : 'grid-cols-2')}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-sm font-medium transition-colors',
              'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800',
              'has-checked:border-green-700 has-checked:bg-green-50 has-checked:text-green-800',
              'dark:has-checked:border-green-500 dark:has-checked:bg-green-900/30 dark:has-checked:text-green-300',
              'has-focus-visible:ring-2 has-focus-visible:ring-green-700 has-focus-visible:ring-offset-1'
            )}
          >
            <input type="radio" value={o.value} {...registration} className="sr-only" />
            {o.color && (
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: o.color }} aria-hidden="true" />
            )}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
