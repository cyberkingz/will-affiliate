'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Team, TeamMembership, TeamRole, hasPermission } from '@/types/team'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface TeamContextValue {
  currentTeam: Team | null
  currentMembership: TeamMembership | null
  teams: Team[]
  isLoading: boolean
  switchTeam: (teamId: string) => Promise<void>
  createTeam: (data: { name: string; slug: string; description?: string }) => Promise<Team>
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>
  hasPermission: (permission: string) => boolean
  refreshTeams: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined)

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider')
  }
  return context
}

interface TeamProviderProps {
  children: React.ReactNode
  userId: string
}

export function TeamProvider({ children, userId }: TeamProviderProps) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [currentMembership, setCurrentMembership] = useState<TeamMembership | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Load teams and memberships
  const loadTeams = useCallback(async () => {
    try {
      // Get all teams where user is a member
      const { data: memberships, error: membershipError } = await supabase
        .from('team_memberships')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (membershipError) throw membershipError

      const userTeams = memberships?.map(m => m.team).filter(Boolean) as Team[]
      setTeams(userTeams || [])

      // Get current team from localStorage or use first team
      const savedTeamId = localStorage.getItem('current_team_id')
      const currentTeamData = savedTeamId 
        ? userTeams?.find(t => t.id === savedTeamId) || userTeams?.[0]
        : userTeams?.[0]

      if (currentTeamData) {
        setCurrentTeam(currentTeamData)
        const membership = memberships?.find(m => m.team_id === currentTeamData.id)
        setCurrentMembership(membership || null)
        localStorage.setItem('current_team_id', currentTeamData.id)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  // Subscribe to team changes
  useEffect(() => {
    const channel = supabase
      .channel('team-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `id=in.(${teams.map(t => t.id).join(',')})`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setTeams(prev => prev.map(t => 
              t.id === payload.new.id ? payload.new as Team : t
            ))
            if (currentTeam?.id === payload.new.id) {
              setCurrentTeam(payload.new as Team)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_memberships',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadTeams()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teams, currentTeam, userId, supabase, loadTeams])

  const switchTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) {
      toast.error('Team not found')
      return
    }

    const { data: membership } = await supabase
      .from('team_memberships')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    setCurrentTeam(team)
    setCurrentMembership(membership)
    localStorage.setItem('current_team_id', teamId)
    
    // Refresh the page to reload data with new team context
    router.refresh()
    toast.success(`Switched to ${team.name}`)
  }

  const createTeam = async (data: { name: string; slug: string; description?: string }) => {
    try {
      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          ...data,
          created_by: userId
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Create owner membership
      const { error: membershipError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: newTeam.id,
          user_id: userId,
          role: 'owner' as TeamRole,
          is_active: true
        })

      if (membershipError) throw membershipError

      // Refresh teams
      await loadTeams()
      
      toast.success('Team created successfully')
      return newTeam
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error('Failed to create team')
      throw error
    }
  }

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)

      if (error) throw error

      // Update local state
      setTeams(prev => prev.map(t => 
        t.id === teamId ? { ...t, ...updates } : t
      ))
      
      if (currentTeam?.id === teamId) {
        setCurrentTeam({ ...currentTeam, ...updates })
      }

      toast.success('Team updated successfully')
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error('Failed to update team')
      throw error
    }
  }

  const checkPermission = (permission: string) => {
    if (!currentMembership) return false
    return hasPermission(currentMembership.role, permission)
  }

  const refreshTeams = async () => {
    setIsLoading(true)
    await loadTeams()
  }

  const value: TeamContextValue = {
    currentTeam,
    currentMembership,
    teams,
    isLoading,
    switchTeam,
    createTeam,
    updateTeam,
    hasPermission: checkPermission,
    refreshTeams
  }

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}