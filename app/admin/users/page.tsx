import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { UserManagement } from '@/components/admin/user-management'

export default async function AdminUsersPage() {
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

  if (!userProfile || userProfile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <DashboardLayout user={userProfile}>
      <div className="container mx-auto px-6 py-8">
        <UserManagement />
      </div>
    </DashboardLayout>
  )
}