import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import AdminUsersList from '@/components/admin/AdminUsersList'
import { getProfile } from '@/lib/actions/profile'
import { listAllUsers } from '@/lib/actions/permissions'

export default async function AdminUsersPage() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (!profile.is_admin) redirect('/profile')

  const users = await listAllUsers()

  return (
    <MobileShell>
      <PageHeader title="Usuários" />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Todo mundo pode entrar com a conta Google, mas só quem tem permissão consegue registrar novas
          plantas no mapa. Aprove pedidos pendentes ou conceda/revogue a permissão diretamente.
        </p>
        <AdminUsersList initialUsers={users} />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
