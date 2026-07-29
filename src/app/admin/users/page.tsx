import AdminUsersList from '@/components/admin/AdminUsersList'
import { listAllUsers } from '@/lib/actions/permissions'

export default async function AdminUsersPage() {
  const users = await listAllUsers()

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Administração</p>
      <h1 className="mb-2 font-serif text-2xl text-gray-900 dark:text-gray-100">Quem tem acesso a quê</h1>
      <p className="mb-6 max-w-prose text-sm text-gray-500 dark:text-gray-400">
        Todo mundo pode entrar com a conta Google, mas só quem tem permissão consegue registrar novas
        plantas no mapa. Aprove pedidos pendentes ou conceda/revogue a permissão diretamente.
      </p>
      <AdminUsersList initialUsers={users} />
    </div>
  )
}
