'use client'

import { useState } from 'react'
import { useTeam } from '@/contexts/team-context'
import { TeamRole } from '@/types/team'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserPlus, Send, Mail, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InviteTeamMemberProps {
  teamId: string
  onInvited?: () => void
  trigger?: React.ReactNode
}

const roleDescriptions: Record<TeamRole, string> = {
  owner: 'Full control over team, billing, and all settings',
  admin: 'Can manage team members, settings, and campaigns',
  member: 'Can create and manage campaigns, view team data',
  viewer: 'Can only view team data and reports'
}

export function InviteTeamMember({ teamId, onInvited, trigger }: InviteTeamMemberProps) {
  const { currentMembership, hasPermission } = useTeam()
  const [isOpen, setIsOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('member')
  const supabase = createClient()

  if (!hasPermission('team.members.invite')) {
    return null
  }

  const handleInvite = async () => {
    if (!email) {
      toast.error('Please enter an email address')
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsInviting(true)
    try {
      // Call the edge function to send invitation
      const { data, error } = await supabase.functions.invoke('team-invite', {
        body: {
          teamId,
          email,
          role
        }
      })

      if (error) throw error

      toast.success(`Invitation sent to ${email}`)
      setEmail('')
      setRole('member')
      setIsOpen(false)
      onInvited?.()
    } catch (error: unknown) {
      console.error('Error inviting member:', error)
      const message = error instanceof Error ? error.message : 'Failed to send invitation'
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  // Prevent members from inviting owners or admins
  const availableRoles: TeamRole[] = 
    currentMembership?.role === 'admin' 
      ? ['member', 'viewer']
      : ['admin', 'member', 'viewer']

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your team. They will receive an email with instructions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="col-span-3"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role & Permissions
            </Label>
            <Select value={role} onValueChange={(value: TeamRole) => setRole(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex flex-col">
                      <span className="font-medium capitalize">{r}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleDescriptions[r]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>An invitation email will be sent to {email || 'the recipient'}</li>
              <li>They will have 7 days to accept the invitation</li>
              <li>Once accepted, they will have {role} access to your team</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isInviting}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isInviting || !email}>
            {isInviting ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
