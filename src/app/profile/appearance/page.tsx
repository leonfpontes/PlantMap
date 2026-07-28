import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import AppearanceSettings from '@/components/profile/AppearanceSettings'
import { createClient } from '@/lib/supabase/server'
import { getAppearancePrefs } from '@/lib/actions/appearance'

export default async function AppearancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const prefs = await getAppearancePrefs()

  return (
    <MobileShell>
      <PageHeader title="Aparência" />

      <div className="flex-1 overflow-y-auto p-4">
        <AppearanceSettings
          initialTheme={prefs?.theme ?? 'system'}
          initialFontScale={prefs?.fontScale ?? 'normal'}
        />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
