import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import AdminRealtimeSync from '@/components/admin/AdminRealtimeSync'
import { getProfile } from '@/lib/actions/profile'
import { listPendingSpecies } from '@/lib/actions/species'
import { getOpenSupportMessageCount } from '@/lib/actions/support'
import { getOpenPermissionRequestCount } from '@/lib/actions/permissions'

/**
 * Checagem de admin centralizada para toda a área /admin/* — antes cada
 * página repetia `if (!profile.is_admin) redirect(...)` individualmente.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (!profile.is_admin) redirect('/profile')

  // Contadores de pendência no servidor, e não dentro do AdminShell: assim
  // um revalidatePath após aprovar/rejeitar os recalcula junto com a página,
  // em vez de deixá-los presos na primeira renderização do cliente.
  const [pendingSpecies, support, users] = await Promise.all([
    listPendingSpecies(),
    getOpenSupportMessageCount(),
    getOpenPermissionRequestCount(),
  ])

  return (
    <AdminShell counts={{ species: pendingSpecies.length, support, users }}>
      {/* Só dentro de /admin: é a única área que mostra esses contadores, e
          não faz sentido manter a assinatura de pé no app inteiro. */}
      <AdminRealtimeSync />
      {children}
    </AdminShell>
  )
}
