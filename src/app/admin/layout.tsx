import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { getProfile } from '@/lib/actions/profile'

/**
 * Checagem de admin centralizada para toda a área /admin/* — antes cada
 * página repetia `if (!profile.is_admin) redirect(...)` individualmente.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (!profile.is_admin) redirect('/profile')

  return <AdminShell>{children}</AdminShell>
}
