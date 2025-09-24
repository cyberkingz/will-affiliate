'use client'

import { useState, useEffect } from 'react'
import { useTeam } from '@/contexts/team-context'
import { TeamSettings as TeamSettingsType } from '@/types/team'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Settings,
  Save,
  Upload,
  Trash2,
  AlertTriangle,
  Bell,
  CreditCard,
  Shield,
  Users,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function TeamSettingsPage() {
  const { currentTeam, currentMembership, updateTeam, hasPermission } = useTeam()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [teamData, setTeamData] = useState({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    billing_email: ''
  })
  const [settings, setSettings] = useState<TeamSettingsType>({
    timezone: 'UTC',
    currency: 'USD',
    date_format: 'MM/dd/yyyy',
    notifications: {
      email_reports: true,
      alert_thresholds: true,
      team_updates: true
    },
    features: {
      advanced_analytics: false,
      api_access: false,
      custom_reporting: false,
      white_label: false
    }
  })

  const supabase = createClient()

  useEffect(() => {
    if (currentTeam) {
      setTeamData({
        name: currentTeam.name,
        slug: currentTeam.slug,
        description: currentTeam.description || '',
        logo_url: currentTeam.logo_url || '',
        billing_email: currentTeam.billing_email || ''
      })
      
      if (currentTeam.settings) {
        setSettings({ ...settings, ...currentTeam.settings })
      }
    }
  }, [currentTeam])

  const handleSave = async () => {
    if (!currentTeam || !hasPermission('team.settings.update')) {
      toast.error('You do not have permission to update team settings')
      return
    }

    setIsSaving(true)
    try {
      await updateTeam(currentTeam.id, {
        ...teamData,
        settings
      })
      toast.success('Team settings updated successfully')
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error('Failed to update team settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!currentTeam || currentMembership?.role !== 'owner') return

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', currentTeam.id)

      if (error) throw error

      toast.success('Team deleted successfully')
      // Redirect to dashboard or teams page
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Failed to delete team')
    }
  }

  if (!currentTeam) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Settings</h1>
          <p className="text-muted-foreground">No team selected</p>
        </div>
      </div>
    )
  }

  if (!hasPermission('team.settings.view')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Settings</h1>
          <p className="text-muted-foreground">You do not have permission to view team settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Team Settings</h1>
        <p className="text-muted-foreground">Manage your team configuration and preferences</p>
      </div>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Information
          </CardTitle>
          <CardDescription>
            Basic information about your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={teamData.logo_url} />
              <AvatarFallback className="text-lg">
                {teamData.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Button variant="outline" size="sm" disabled={!hasPermission('team.update')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: Square image, max 2MB
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={teamData.name}
                onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
                disabled={!hasPermission('team.update')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Team Slug</Label>
              <Input
                id="slug"
                value={teamData.slug}
                onChange={(e) => setTeamData({ 
                  ...teamData, 
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                })}
                disabled={!hasPermission('team.update')}
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs and must be unique
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={teamData.description}
              onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
              disabled={!hasPermission('team.update')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_email">Billing Email</Label>
            <Input
              id="billing_email"
              type="email"
              value={teamData.billing_email}
              onChange={(e) => setTeamData({ ...teamData, billing_email: e.target.value })}
              disabled={!hasPermission('team.update')}
            />
            <p className="text-xs text-muted-foreground">
              Email address for billing and invoices
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription & Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription & Billing
          </CardTitle>
          <CardDescription>
            Manage your team subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Plan</span>
                <Badge className="capitalize">
                  {currentTeam.subscription_tier || 'free'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentTeam.subscription_status === 'trialing' && currentTeam.trial_ends_at
                  ? `Trial ends ${new Date(currentTeam.trial_ends_at).toLocaleDateString()}`
                  : `Status: ${currentTeam.subscription_status || 'active'}`}
              </p>
            </div>
            {currentMembership?.role === 'owner' && (
              <Button variant="outline">
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>
            Configure team-wide preferences and defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select 
                value={settings.timezone} 
                onValueChange={(value) => setSettings({ 
                  ...settings, 
                  timezone: value 
                })}
                disabled={!hasPermission('team.settings.update')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Paris">Paris</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select 
                value={settings.currency} 
                onValueChange={(value) => setSettings({ 
                  ...settings, 
                  currency: value 
                })}
                disabled={!hasPermission('team.settings.update')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select 
                value={settings.date_format} 
                onValueChange={(value) => setSettings({ 
                  ...settings, 
                  date_format: value 
                })}
                disabled={!hasPermission('team.settings.update')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                  <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                  <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure what notifications team members receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Weekly performance reports via email
                </p>
              </div>
              <Switch
                checked={settings.notifications?.email_reports}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email_reports: checked }
                })}
                disabled={!hasPermission('team.settings.update')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Alert Thresholds</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications when metrics hit thresholds
                </p>
              </div>
              <Switch
                checked={settings.notifications?.alert_thresholds}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, alert_thresholds: checked }
                })}
                disabled={!hasPermission('team.settings.update')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Team Updates</Label>
                <p className="text-sm text-muted-foreground">
                  New members, role changes, and team activity
                </p>
              </div>
              <Switch
                checked={settings.notifications?.team_updates}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, team_updates: checked }
                })}
                disabled={!hasPermission('team.settings.update')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <div>
          {currentMembership?.role === 'owner' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Team
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Team
                  </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the team{' '}
            <span className="font-semibold">{currentTeam.name}</span> and remove all associated data including campaigns,
            network connections, and member access.
          </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteTeam}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {hasPermission('team.settings.update') && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
