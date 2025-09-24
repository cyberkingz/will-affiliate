'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTeam } from '@/contexts/team-context'
import { TeamMember, TeamInvitation, TeamRole } from '@/types/team'
import { InviteTeamMember } from './invite-team-member'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MoreHorizontal,
  Shield,
  UserX,
  Clock,
  Mail,
  AlertTriangle,
  Users,
  UserPlus,
  Copy,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TeamMembersProps {
  teamId: string
}

type MembershipRecord = {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url?: string | null
  }
  role?: TeamRole
  joined_at?: string
  is_active?: boolean
}

export function TeamMembers({ teamId }: TeamMembersProps) {
  const { currentMembership, hasPermission } = useTeam()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [invitationToCancel, setInvitationToCancel] = useState<TeamInvitation | null>(null)
  const supabase = createClient()

  const loadMembers = useCallback(async () => {
    try {
      // Load team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_memberships')
        .select(`
          *,
          user:users(id, email, full_name)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .returns<MembershipRecord[]>()

      if (membersError) throw membersError

      const teamMembers = (membersData ?? []).map((m) => ({
        id: m.user.id,
        email: m.user.email,
        full_name: m.user.full_name ?? undefined,
        avatar_url: m.user.avatar_url ?? undefined,
        role: m.role ?? 'member',
        joined_at: m.joined_at ?? new Date().toISOString(),
        is_active: m.is_active ?? true
      })) || []

      setMembers(teamMembers)

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (invitationsError) throw invitationsError
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error('Error loading team data:', error)
      toast.error('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, teamId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const updateMemberRole = async (memberId: string, newRole: TeamRole) => {
    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', memberId)

      if (error) throw error

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ))
      toast.success('Member role updated')
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error('Failed to update member role')
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ is_active: false })
        .eq('team_id', teamId)
        .eq('user_id', memberId)

      if (error) throw error

      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast.success('Member removed from team')
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      toast.success('Invitation cancelled')
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation')
    }
  }

  const resendInvitation = async (invitation: TeamInvitation) => {
    try {
      const { error } = await supabase.functions.invoke('team-invite', {
        body: {
          teamId,
          email: invitation.email,
          role: invitation.role
        }
      })

      if (error) throw error
      toast.success('Invitation resent')
    } catch (error: unknown) {
      console.error('Error resending invitation:', error)
      const message = error instanceof Error ? error.message : 'Failed to resend invitation'
      toast.error(message)
    }
  }

  const copyInviteLink = async (invitation: TeamInvitation) => {
    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Invite link copied to clipboard')
  }

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800 border-red-200'
      case 'admin': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'member': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-neutral-800 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-neutral-800 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-neutral-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        {hasPermission('team.members.invite') && (
          <InviteTeamMember teamId={teamId} onInvited={loadMembers} />
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Pending ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Active members of your team and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {hasPermission('team.members.update_role') && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>
                              {member.full_name?.charAt(0) || member.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name || 'Unnamed'}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.joined_at), 'MMM d, yyyy')}
                      </TableCell>
                      {hasPermission('team.members.update_role') && (
                        <TableCell className="text-right">
                          {member.id !== currentMembership?.user_id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {member.role !== 'admin' && currentMembership?.role === 'owner' && (
                                  <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'admin')}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Make Admin
                                  </DropdownMenuItem>
                                )}
                                {member.role !== 'member' && (
                                  <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'member')}>
                                    <Users className="mr-2 h-4 w-4" />
                                    Make Member
                                  </DropdownMenuItem>
                                )}
                                {member.role !== 'viewer' && (
                                  <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'viewer')}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Make Viewer
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setMemberToRemove(member)}
                                  className="text-destructive"
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Remove from team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No team members found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that have not been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {invitation.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {invitation.expires_at
                            ? format(new Date(invitation.expires_at), 'MMM d, yyyy')
                            : 'No expiration'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resendInvitation(invitation)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyInviteLink(invitation)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy invite link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setInvitationToCancel(invitation)}
                              className="text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Cancel invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {invitations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No pending invitations
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove member confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Team Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.full_name || memberToRemove?.email}</strong> from the team?
              They will lose access to all team data and campaigns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (memberToRemove) {
                  removeMember(memberToRemove.id)
                  setMemberToRemove(null)
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel invitation confirmation */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation for <strong>{invitationToCancel?.email}</strong>?
              The invitation link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (invitationToCancel) {
                  cancelInvitation(invitationToCancel.id)
                  setInvitationToCancel(null)
                }
              }}
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
