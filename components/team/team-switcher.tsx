'use client'

import { useState } from 'react'
import { useTeam } from '@/contexts/team-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  ChevronDown,
  Plus,
  Settings,
  Users,
  CreditCard
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function TeamSwitcher() {
  const { currentTeam, currentMembership, teams, switchTeam, createTeam, isLoading } = useTeam()
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    slug: '',
    description: ''
  })

  const handleCreateTeam = async () => {
    if (!newTeamData.name || !newTeamData.slug) {
      toast.error('Team name and slug are required')
      return
    }

    setIsCreating(true)
    try {
      const newTeam = await createTeam(newTeamData)
      setIsCreateDialogOpen(false)
      setNewTeamData({ name: '', slug: '', description: '' })
      await switchTeam(newTeam.id)
    } catch (error) {
      console.error('Error creating team:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-[200px] justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse bg-neutral-700 rounded" />
          <span className="animate-pulse bg-neutral-700 h-4 w-20 rounded" />
        </div>
        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={currentTeam?.logo_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {currentTeam?.name?.charAt(0) || 'T'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{currentTeam?.name || 'Select Team'}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px]" align="start">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Team
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                className="cursor-pointer"
                onSelect={() => switchTeam(team.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={team.logo_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {team.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">{team.name}</span>
                      {team.subscription_tier && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                          {team.subscription_tier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {currentTeam?.id === team.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Team
          </DropdownMenuItem>

          {currentTeam && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Current Team ({currentMembership?.role})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => router.push('/team/members')}
              >
                <Users className="mr-2 h-4 w-4" />
                Team Members
              </DropdownMenuItem>

              {(currentMembership?.role === 'owner' || currentMembership?.role === 'admin') && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => router.push('/team/settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Team Settings
                </DropdownMenuItem>
              )}

              {currentMembership?.role === 'owner' && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => router.push('/team/billing')}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Plans
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team to collaborate with others on your affiliate campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={newTeamData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setNewTeamData({
                    ...newTeamData,
                    name,
                    slug: generateSlug(name)
                  })
                }}
                placeholder="My Awesome Team"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Team Slug</Label>
              <Input
                id="slug"
                value={newTeamData.slug}
                onChange={(e) => setNewTeamData({
                  ...newTeamData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                })}
                placeholder="my-awesome-team"
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs and must be unique
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newTeamData.description}
                onChange={(e) => setNewTeamData({
                  ...newTeamData,
                  description: e.target.value
                })}
                placeholder="What's this team about?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
