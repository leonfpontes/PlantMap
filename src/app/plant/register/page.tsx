import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import RegisterForm from '@/components/plant/RegisterForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <MobileShell>
      <PageHeader title="Registrar Ocorrência" />
      <div className="flex-1 overflow-y-auto p-4">
        <RegisterForm />
      </div>
      <BottomNav />
    </MobileShell>
  )
}
