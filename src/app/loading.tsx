import SproutLoader from '@/components/loading/SproutLoader'

/**
 * UI de loading nativa do App Router: o Next.js envolve `{children}` do
 * layout raiz (ver app/layout.tsx + AppShell) numa Suspense boundary e
 * mostra isto enquanto a página de destino busca dados no servidor — a
 * Sidebar, fora de `{children}`, permanece parada, só o conteúdo troca.
 *
 * Usa a mesma "moldura" do MobileShell no formato 'comfortable' (a maioria
 * das páginas) para o card não trocar de forma de repente quando o
 * conteúdo real chega; só o mapa (desktopWidth="full") ocupa mais espaço
 * que isso, o que é um detalhe aceitável no único ponto de entrada dele.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center lg:p-10">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col items-center justify-center bg-white dark:bg-gray-950 lg:h-[calc(100dvh-5rem)] lg:max-w-2xl lg:rounded-3xl lg:border lg:border-gray-100 lg:shadow-sm dark:lg:border-gray-800">
        <SproutLoader />
      </div>
    </div>
  )
}
