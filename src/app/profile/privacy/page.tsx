import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PrivacySettings from '@/components/profile/PrivacySettings'
import { createClient } from '@/lib/supabase/server'
import { getPrivacyPrefs } from '@/lib/actions/privacy'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const prefs = await getPrivacyPrefs()

  return (
    <MobileShell>
      <PageHeader title="Privacidade" />

      <div className="flex-1 overflow-y-auto p-4">
        <PrivacySettings initialShareExactLocation={prefs?.shareExactLocation ?? false} />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
