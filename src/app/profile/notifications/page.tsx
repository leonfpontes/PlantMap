import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import NotificationsList from '@/components/profile/NotificationsList'
import { createClient } from '@/lib/supabase/server'
import { listNotifications } from '@/lib/actions/notifications'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const notifications = await listNotifications()

  return (
    <MobileShell>
      <PageHeader title="Notificações" />

      <div className="flex-1 overflow-y-auto p-4">
        <NotificationsList initialNotifications={notifications} />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
