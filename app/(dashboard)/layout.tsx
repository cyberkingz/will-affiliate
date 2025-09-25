import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardUserProvider } from '@/components/dashboard/dashboard-user-context'

interface DashboardGroupLayoutProps {
  children: ReactNode
}

export default async function DashboardGroupLayout({ children }: DashboardGroupLayoutProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/auth/login')
  }

  return (
    <DashboardUserProvider user={userProfile}>
      <DashboardLayout user={userProfile}>{children}</DashboardLayout>
    </DashboardUserProvider>
  )
}
