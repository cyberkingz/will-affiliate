import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { TeamMembers } from '@/components/team/team-members'

export default async function TeamMembersPage() {
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

  // Get user's current team (for now, we'll use the first team they belong to)
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!membership) {
    // User doesn't belong to any team yet - redirect to create team flow
    redirect('/team/create')
  }

  return (
    <DashboardLayout user={userProfile}>
      <div className="container mx-auto px-6 py-8">
        <TeamMembers teamId={membership.team_id} />
      </div>
    </DashboardLayout>
  )
}