// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
  teamId: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
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
      const { teamId, email, role }: InviteRequest = await req.json()

      // Validate input
      if (!teamId || !email || !role) {
        throw new Error('Missing required fields: teamId, email, role')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format')
      }

      // Check if user has permission to invite (admin or owner)
      const { data: membership, error: membershipError } = await supabaseClient
        .from('team_memberships')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (membershipError || !membership) {
        throw new Error('User is not a member of this team')
      }

      if (!['admin', 'owner'].includes(membership.role)) {
        throw new Error('Insufficient permissions to invite users')
      }

      // Check if invitation already exists
      const { data: existingInvite } = await supabaseClient
        .from('team_invitations')
        .select('id, status')
        .eq('team_id', teamId)
        .eq('email', email)
        .eq('status', 'pending')
        .single()

      if (existingInvite) {
        throw new Error('Invitation already exists for this email')
      }

      // Check if user is already a team member
      const { data: existingMember } = await supabaseClient
        .from('team_memberships')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        throw new Error('User is already a member of this team')
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabaseClient
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: email.toLowerCase(),
          role: role,
          invited_by: user.id,
        })
        .select()
        .single()

      if (inviteError) {
        throw new Error(`Failed to create invitation: ${inviteError.message}`)
      }

      // Log the invitation
      await supabaseClient
        .from('team_audit_logs')
        .insert({
          team_id: teamId,
          actor_id: user.id,
          action: 'user_invited',
          resource_type: 'user',
          resource_id: email,
          details: { role, invitation_id: invitation.id },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        })

      // TODO: Send invitation email using a service like Resend
      // This would be integrated with your email service

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            invitation: {
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              expires_at: invitation.expires_at,
            }
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle GET request - list pending invitations
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const teamId = url.searchParams.get('teamId')

      if (!teamId) {
        throw new Error('Missing teamId parameter')
      }

      // Check if user has permission to view invitations
      const { data: membership, error: membershipError } = await supabaseClient
        .from('team_memberships')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (membershipError || !membership) {
        throw new Error('User is not a member of this team')
      }

      // Get pending invitations
      const { data: invitations, error: invitationsError } = await supabaseClient
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          status,
          expires_at,
          created_at,
          invited_by:users!team_invitations_invited_by_fkey(email, full_name)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitationsError) {
        throw new Error(`Failed to fetch invitations: ${invitationsError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { invitations }
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
