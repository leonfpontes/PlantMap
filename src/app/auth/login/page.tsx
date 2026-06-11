'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Leaf } from 'lucide-react'
import { signInWithGoogle, signInWithEmail, signUp } from '@/lib/actions/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().optional(),
})

type LoginData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginData) => {
    setServerError(null)
    setSuccessMsg(null)

    if (mode === 'login') {
      const result = await signInWithEmail(data.email, data.password)
      if (result?.error) setServerError(result.error)
    } else {
      const result = await signUp(data.email, data.password, data.name || '')
      if (result?.error) setServerError(result.error)
      else if (result?.success) setSuccessMsg(result.message || 'Cadastro realizado!')
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-[390px] rounded-3xl bg-white p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-700">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PlantMap</h1>
          <p className="text-sm text-gray-500">Mapeie a flora da sua região</p>
        </div>

        {/* Google */}
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>
        </form>

        <div className="relative my-6 flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <Input
              label="Nome"
              {...register('name')}
              placeholder="Seu nome completo"
              error={errors.name?.message}
            />
          )}
          <Input
            label="Email"
            type="email"
            {...register('email')}
            placeholder="seu@email.com"
            error={errors.email?.message}
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            {...register('password')}
            placeholder="••••••••"
            error={errors.password?.message}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}
          {successMsg && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMsg}</p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-1">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setServerError(null) }}
            className="font-medium text-green-700 hover:underline"
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
