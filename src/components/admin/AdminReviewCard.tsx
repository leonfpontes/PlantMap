import Badge from '@/components/ui/Badge'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

interface AdminReviewCardProps {
  /** Avatar do usuário (componente Avatar) ou um ícone num círculo colorido — cada domínio decide o que faz sentido. */
  avatar: React.ReactNode
  title: string
  subtitle?: string
  /** Texto pequeno à direita do título (ex.: "há 2 dias"). */
  meta?: string
  pills?: { label: string; variant: BadgeVariant }[]
  /** Bloco de mensagem/descrição citada (mensagem de suporte, motivo de pedido, descrição da espécie). */
  message?: string
  tags?: string[]
  /** Botões de ação ou formulário de motivo — cada domínio decide o conteúdo. */
  footer?: React.ReactNode
  /** Itens já resolvidos/arquivados ficam com opacidade reduzida. */
  dimmed?: boolean
}

/**
 * Cartão de revisão único, reaproveitado em toda a área administrativa
 * (moderação de espécies, suporte, usuários, visão geral) — cada tela decide
 * o conteúdo, mas a moldura e o ritmo visual são os mesmos em todo lugar.
 */
export default function AdminReviewCard({
  avatar, title, subtitle, meta, pills, message, tags, footer, dimmed,
}: AdminReviewCardProps) {
  return (
    <div
      className={
        'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900' +
        (dimmed ? ' opacity-75' : '')
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
              {subtitle && <p className="truncate text-xs italic text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              {meta && <span className="text-xs text-gray-400 dark:text-gray-500">{meta}</span>}
              {pills && pills.length > 0 && (
                <div className="flex gap-1">
                  {pills.map((p) => (
                    <Badge key={p.label} variant={p.variant}>{p.label}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">{t}</span>
              ))}
            </div>
          )}

          {message && (
            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
              {message}
            </p>
          )}

          {footer && <div className="mt-3">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
