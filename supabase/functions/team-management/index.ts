import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateTeamRequest {
  name: string
  slug: string
  description?: string
}

interface UpdateMemberRequest {
  memberId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

interface RemoveMemberRequest {
  memberId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // CREATE TEAM
    if (req.method === 'POST' && path === 'create') {
      const { name, slug, description }: CreateTeamRequest = await req.json()

      // Validate input
      if (!name || !slug) {
        throw new Error('Missing required fields: name, slug')
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens')
      }

      // Check if slug is already taken
      const { data: existingTeam } = await supabaseClient
        .from('teams')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existingTeam) {
        throw new Error('This team slug is already taken')
      }

      // Create the team
      const { data: team, error: teamError } = await supabaseClient
        .from('teams')
        .insert({
          name,
          slug,
          description,
        })
        .select()
        .single()

      if (teamError) {
        throw new Error(`Failed to create team: ${teamError.message}`)
      }

      // Add the creator as owner
      const { data: membership, error: membershipError } = await supabaseClient
        .from('team_memberships')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
        })
        .select()
        .single()

      if (membershipError) {
        // Rollback team creation
        await supabaseClient.from('teams').delete().eq('id', team.id)
        throw new Error(`Failed to create team membership: ${membershipError.message}`)
      }

      // Update user's default team if they don't have one
      const { data: userData } = await supabaseClient
        .from('users')
        .select('default_team_id')
        .eq('id', user.id)
        .single()

      if (!userData?.default_team_id) {
        await supabaseClient
          .from('users')
          .update({
            default_team_id: team.id,
            onboarded_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      // Log team creation
      await supabaseClient
        .from('team_audit_logs')
        .insert({
          team_id: team.id,
          actor_id: user.id,
          action: 'team_settings_updated',
          resource_type: 'team',
          resource_id: team.id,
          details: { action: 'created', name, slug },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        })

      return new Response(
        JSON.stringify({
          success: true,
          data: { team, membership }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        }
      )
    }

    // UPDATE MEMBER ROLE
    if (req.method === 'PUT' && path === 'update-member') {
      const { memberId, role }: UpdateMemberRequest = await req.json()

      if (!memberId || !role) {
        throw new Error('Missing required fields: memberId, role')
      }

      // Get the membership to update
      const { data: targetMembership, error: membershipError } = await supabaseClient
        .from('team_memberships')
        .select('*, team_id')
        .eq('id', memberId)
        .single()

      if (membershipError || !targetMembership) {
        throw new Error('Membership not found')
      }

      // Check if current user has permission to update roles
      const { data: currentMembership, error: currentError } = await supabaseClient
        .from('team_memberships')
        .select('role')
        .eq('team_id', targetMembership.team_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (currentError || !currentMembership) {
        throw new Error('You are not a member of this team')
      }

      // Only owners and admins can update roles
      if (!['admin', 'owner'].includes(currentMembership.role)) {
        throw new Error('Insufficient permissions to update member roles')
      }

      // Owners cannot be demoted by others
      if (targetMembership.role === 'owner' && currentMembership.role !== 'owner') {
        throw new Error('Only owners can change owner roles')
      }

      // Update the role
      const { data: updatedMembership, error: updateError } = await supabaseClient
        .from('team_memberships')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update member role: ${updateError.message}`)
      }

      // Log the role change
      await supabaseClient
        .from('team_audit_logs')
        .insert({
          team_id: targetMembership.team_id,
          actor_id: user.id,
          action: 'role_changed',
          resource_type: 'user',
          resource_id: targetMembership.user_id,
          details: { 
            old_role: targetMembership.role, 
            new_role: role,
            membership_id: memberId 
          },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        })

      return new Response(
        JSON.stringify({
          success: true,
          data: { membership: updatedMembership }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // REMOVE MEMBER
    if (req.method === 'DELETE' && path === 'remove-member') {
      const { memberId }: RemoveMemberRequest = await req.json()

      if (!memberId) {
        throw new Error('Missing required field: memberId')
      }

      // Get the membership to remove
      const { data: targetMembership, error: membershipError } = await supabaseClient
        .from('team_memberships')
        .select('*, team_id, user_id')
        .eq('id', memberId)
        .single()

      if (membershipError || !targetMembership) {
        throw new Error('Membership not found')
      }

      // Check if current user has permission to remove members
      const { data: currentMembership, error: currentError } = await supabaseClient
        .from('team_memberships')
        .select('role')
        .eq('team_id', targetMembership.team_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (currentError || !currentMembership) {
        throw new Error('You are not a member of this team')
      }

      // Only owners and admins can remove members, but owners cannot be removed
      if (!['admin', 'owner'].includes(currentMembership.role)) {
        throw new Error('Insufficient permissions to remove members')
      }

      if (targetMembership.role === 'owner') {
        throw new Error('Team owners cannot be removed')
      }

      // Users can remove themselves
      const canRemove = 
        targetMembership.user_id === user.id || 
        ['admin', 'owner'].includes(currentMembership.role)

      if (!canRemove) {
        throw new Error('Insufficient permissions to remove this member')
      }

      // Deactivate the membership instead of deleting
      const { error: updateError } = await supabaseClient
        .from('team_memberships')
        .update({ is_active: false })
        .eq('id', memberId)

      if (updateError) {
        throw new Error(`Failed to remove member: ${updateError.message}`)
      }

      // Log the removal
      await supabaseClient
        .from('team_audit_logs')
        .insert({
          team_id: targetMembership.team_id,
          actor_id: user.id,
          action: 'user_removed',
          resource_type: 'user',
          resource_id: targetMembership.user_id,
          details: { 
            removed_role: targetMembership.role,
            membership_id: memberId,
            self_removal: targetMembership.user_id === user.id
          },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        })

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Member removed successfully' }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Method or path not allowed')

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})