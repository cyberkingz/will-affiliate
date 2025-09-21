import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user details
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-neutral-300">Loading...</div>}>
        <DashboardContent user={userData} />
      </Suspense>
    </div>
  )
}