export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Team {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  settings?: TeamSettings
  subscription_tier?: 'free' | 'starter' | 'professional' | 'enterprise'
  subscription_status?: 'active' | 'trialing' | 'canceled' | 'past_due'
  trial_ends_at?: string
  billing_email?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface TeamSettings {
  timezone?: string
  currency?: string
  date_format?: string
  notifications?: {
    email_reports?: boolean
    alert_thresholds?: boolean
    team_updates?: boolean
  }
  features?: {
    advanced_analytics?: boolean
    api_access?: boolean
    custom_reporting?: boolean
    white_label?: boolean
  }
}

export interface TeamMembership {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  is_active: boolean
  joined_at: string
  invited_at?: string
  invited_by?: string
  updated_at: string
  team?: Team
  user?: TeamMember
}

export interface TeamMember {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: TeamRole
  joined_at: string
  last_active?: string
  is_active: boolean
}

export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: TeamRole
  token: string
  expires_at: string
  created_at: string
  created_by: string
  accepted_at?: string
  team?: Team
  inviter?: TeamMember
}

export interface TeamAuditLog {
  id: string
  team_id: string
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: TeamMember
}

export interface TeamStats {
  total_members: number
  total_campaigns: number
  total_networks: number
  total_revenue: number
  active_members: number
  pending_invitations: number
}

// Permission helpers
export const rolePermissions: Record<TeamRole, string[]> = {
  owner: ['*'], // All permissions
  admin: [
    'team.update',
    'team.members.view',
    'team.members.invite',
    'team.members.remove',
    'team.members.update_role',
    'team.settings.view',
    'team.settings.update',
    'team.billing.view',
    'campaigns.create',
    'campaigns.update',
    'campaigns.delete',
    'campaigns.view',
    'networks.create',
    'networks.update',
    'networks.delete',
    'networks.view'
  ],
  member: [
    'team.members.view',
    'team.settings.view',
    'campaigns.create',
    'campaigns.update',
    'campaigns.view',
    'networks.view'
  ],
  viewer: [
    'team.members.view',
    'team.settings.view',
    'campaigns.view',
    'networks.view'
  ]
}

export function hasPermission(role: TeamRole, permission: string): boolean {
  const permissions = rolePermissions[role]
  if (!permissions) return false
  if (permissions.includes('*')) return true
  return permissions.includes(permission)
}

export function canManageTeam(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canInviteMembers(role: TeamRole): boolean {
  return hasPermission(role, 'team.members.invite')
}

export function canManageMembers(role: TeamRole): boolean {
  return hasPermission(role, 'team.members.update_role')
}

export function canViewBilling(role: TeamRole): boolean {
  return role === 'owner' || hasPermission(role, 'team.billing.view')
}

export function canManageCampaigns(role: TeamRole): boolean {
  return hasPermission(role, 'campaigns.create')
}
