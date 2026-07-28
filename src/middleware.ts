import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      global: {
        // Sem isso, uma falha/lentidão no serviço de Auth do Supabase trava esta
        // requisição até o limite da função na Vercel (MIDDLEWARE_INVOCATION_TIMEOUT),
        // derrubando todo o site já que o matcher abaixo cobre quase todas as rotas.
        fetch: (input, init) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          return fetch(input, { ...init, signal: controller.signal }).finally(() =>
            clearTimeout(timeoutId)
          )
        },
      },
    }
  )

  // Refreshes the session and propagates the updated token to cookies.
  // Se o Supabase Auth não responder a tempo, segue sem sessão em vez de travar a página.
  try {
    await supabase.auth.getUser()
  } catch {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
