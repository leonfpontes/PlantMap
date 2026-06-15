import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cria um cliente do Supabase configurado para execução do lado do servidor (SSR/Server Components/Server Actions).
 * Utiliza o pacote `@supabase/ssr` para sincronizar os cookies de sessão de forma transparente.
 */
export async function createClient() {
  // Obtém o cookieStore do Next.js. Nota: a partir do Next.js 15, cookies() retorna uma Promise.
  const cookieStore = await cookies()

  // SUPABASE_URL_INTERNAL é usada quando o Next.js roda dentro do container Docker
  // e precisa acessar o Kong Gateway através da rede interna do Docker (http://kong:8000).
  // Fora do Docker (rodando localmente com `npm run dev`), cai no NEXT_PUBLIC_SUPABASE_URL (http://localhost:8000).
  const supabaseUrl =
    process.env.SUPABASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!

  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Recupera todos os cookies atuais para repassar ao cliente do Supabase
        getAll() {
          return cookieStore.getAll()
        },
        // Define cookies de sessão quando necessário (ex: após refresh de token)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silencia o erro caso seja chamado dentro de um Server Component.
            // No modelo do Next.js App Router, cookies só podem ser definidos em Middleware,
            // Route Handlers ou Server Actions. Durante a renderização pura de um Server Component,
            // a resposta HTTP já começou a ser enviada, impedindo a escrita de cabeçalhos Set-Cookie.
          }
        },
      },
    }
  )
}
