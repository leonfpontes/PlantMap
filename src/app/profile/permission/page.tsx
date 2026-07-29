import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PermissionRequestForm from '@/components/profile/PermissionRequestForm'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/actions/profile'
import { listMyPermissionRequests } from '@/lib/actions/permissions'

export default async function PermissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, requests] = await Promise.all([
    getProfile(),
    listMyPermissionRequests(),
  ])

  return (
    <MobileShell>
      <PageHeader title="Permissão para registrar" />

      <div className="flex-1 overflow-y-auto p-4">
        <PermissionRequestForm
          canRegister={profile?.can_register_occurrences ?? false}
          initialRequests={requests}
        />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
