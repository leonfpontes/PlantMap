import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart, LogOut, ChevronRight, Bell, Lock, Palette, HelpCircle, Leaf } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getUserStats } from '@/lib/actions/profile'
import { signOut } from '@/lib/actions/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/map')

  const [profile, stats] = await Promise.all([
    getProfile(),
    getUserStats(user.id),
  ])

  const menuItems = [
    { icon: Bell, label: 'Notificações', href: '#' },
    { icon: Lock, label: 'Privacidade', href: '#' },
    { icon: Palette, label: 'Aparência', href: '#' },
    { icon: HelpCircle, label: 'Ajuda e suporte', href: '#' },
  ]

  return (
    <MobileShell>
      <PageHeader title="Perfil" showBack={false} />

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 bg-green-50 px-6 py-8">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || user.email}
            size="xl"
          />
          <div className="text-center">
            <h2 className="font-bold text-gray-900 text-lg">{profile?.full_name || 'Usuário'}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-white">
          {[
            { label: 'Registros', value: stats.occurrences },
            { label: 'Favoritos', value: stats.favorites },
            { label: 'Espécies', value: stats.species },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-4">
              <span className="text-xl font-bold text-green-700">{value}</span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="p-4 flex flex-col gap-2">
          {/* Favorites link */}
          <Link
            href="/profile/favorites"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">Plantas favoritas</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>

          <Link
            href="/map"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">Meus registros no mapa</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>

          {/* Menu items */}
          <div className="mt-2 rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
            {menuItems.map(({ icon: Icon, label, href }, i) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <Icon className="h-5 w-5 text-gray-500" />
                <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Sair da conta</span>
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  )
}
