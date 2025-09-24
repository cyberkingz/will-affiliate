// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptInviteRequest {
  token: string
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

    if (req.method === 'POST') {
      const { token }: AcceptInviteRequest = await req.json()

      if (!token) {
        throw new Error('Missing invitation token')
      }

      // Get the invitation
      const { data: invitation, error: inviteError } = await supabaseClient
        .from('team_invitations')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation')
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        await supabaseClient
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)
        
        throw new Error('Invitation has expired')
      }

      // Check if the email matches the logged-in user
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        throw new Error('This invitation is for a different email address')
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabaseClient
        .from('team_memberships')
        .select('id')
        .eq('team_id', invitation.team_id)
        .eq('user_id', user.id)
        .single()

      if (existingMembership) {
        throw new Error('You are already a member of this team')
      }

      // Start transaction by creating membership
      const { data: membership, error: membershipError } = await supabaseClient
        .from('team_memberships')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
        })
        .select()
        .single()

      if (membershipError) {
        throw new Error(`Failed to create membership: ${membershipError.message}`)
      }

      // Update invitation status
      const { error: updateError } = await supabaseClient
        .from('team_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)

      if (updateError) {
        // Rollback membership creation
        await supabaseClient
          .from('team_memberships')
          .delete()
          .eq('id', membership.id)
        
        throw new Error(`Failed to update invitation: ${updateError.message}`)
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
            default_team_id: invitation.team_id,
            onboarded_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      // Log the join event
      await supabaseClient
        .from('team_audit_logs')
        .insert({
          team_id: invitation.team_id,
          actor_id: user.id,
          action: 'user_joined',
          resource_type: 'user',
          resource_id: user.id,
          details: { 
            role: invitation.role, 
            via_invitation: true,
            invitation_id: invitation.id 
          },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        })

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            team: invitation.team,
            membership: {
              id: membership.id,
              role: membership.role,
              joined_at: membership.joined_at,
            }
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle GET request - get invitation details
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const token = url.searchParams.get('token')

      if (!token) {
        throw new Error('Missing token parameter')
      }

      // Get the invitation (don't require auth for this)
      const anonymousClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )

      const { data: invitation, error: inviteError } = await anonymousClient
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          status,
          expires_at,
          team:teams(id, name, description)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation')
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired')
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            invitation: {
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              expires_at: invitation.expires_at,
              team: invitation.team,
            }
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Method not allowed')

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
