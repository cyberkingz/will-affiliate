import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { TeamSettingsPage } from '@/components/team/team-settings'

export default async function TeamSettingsPageRoute() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/login')
  }

  return (
    <DashboardLayout user={userProfile}>
      <div className="container mx-auto px-6 py-8">
        <TeamSettingsPage />
      </div>
    </DashboardLayout>
  )
}