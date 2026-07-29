import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import FaqAccordion from '@/components/profile/FaqAccordion'
import { createClient } from '@/lib/supabase/server'

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <MobileShell>
      <PageHeader title="Ajuda e suporte" />

      <div className="flex-1 overflow-y-auto p-4">
        <FaqAccordion />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
