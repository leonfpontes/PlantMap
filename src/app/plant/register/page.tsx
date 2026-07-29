import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Button from '@/components/ui/Button'
import RegisterForm from '@/components/plant/RegisterForm'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/actions/profile'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/map')

  const profile = await getProfile()

  return (
    <MobileShell>
      <PageHeader title="Registrar Ocorrência" />
      <div className="flex-1 overflow-y-auto p-4">
        {profile?.can_register_occurrences ? (
          <RegisterForm />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/30">
              <ShieldCheck className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">Você ainda não pode registrar plantas</p>
            <p className="max-w-xs text-sm text-gray-400 dark:text-gray-500">
              Para manter a qualidade do catálogo, novos registros de localização dependem de aprovação da administração do terreiro.
            </p>
            <Link href="/profile/permission" className="mt-2">
              <Button variant="primary">Pedir permissão</Button>
            </Link>
          </div>
        )}
      </div>
      <BottomNav />
    </MobileShell>
  )
}
