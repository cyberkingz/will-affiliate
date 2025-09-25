'use client'

import { createContext, useContext } from 'react'
import type { Database } from '@/types/supabase'

export type DashboardUser = Database['public']['Tables']['users']['Row']

const DashboardUserContext = createContext<DashboardUser | null>(null)

interface DashboardUserProviderProps {
  user: DashboardUser
  children: React.ReactNode
}

export function DashboardUserProvider({ user, children }: DashboardUserProviderProps) {
  return <DashboardUserContext.Provider value={user}>{children}</DashboardUserContext.Provider>
}

export function useDashboardUser() {
  const context = useContext(DashboardUserContext)
  if (!context) {
    throw new Error('useDashboardUser must be used within a DashboardUserProvider')
  }
  return context
}
