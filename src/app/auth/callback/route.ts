import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/map'

  if (code) {
    const cookieStore = await cookies()
    
    // Create the response object first so we can set cookies on it
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.SUPABASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
                response.cookies.set(name, value, options)
              })
            } catch (err) {
              console.error('Error setting cookies in OAuth callback:', err)
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const allowedEmails = (process.env.ALLOWED_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
      if (allowedEmails.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email || !allowedEmails.includes(user.email)) {
          await supabase.auth.signOut()
          return NextResponse.redirect(
            `${origin}/auth/login?error=access_denied&message=${encodeURIComponent('Acesso não autorizado para este e-mail.')}`
          )
        }
      }
      return response
    }

    console.error('exchangeCodeForSession error:', error)
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}

