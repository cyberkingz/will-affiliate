'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  UserPlus,
  MoreHorizontal,
  Network,
  Users,
  Trash2,
  Shield,
  AlertTriangle,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'staff'
  created_at: string
  last_sign_in_at?: string
}

interface NetworkConnection {
  id: string
  name: string
  network_type: string
  is_active: boolean
}

interface UserNetworkAccess {
  user_id: string
  network_connection_id: string
  granted_at: string
  granted_by: string
}

interface NetworkAccessDialogProps {
  user: User
  networks: NetworkConnection[]
  currentAccess: string[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (userId: string, networkIds: string[]) => void
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [networks, setNetworks] = useState<NetworkConnection[]>([])
  const [userNetworkAccess, setUserNetworkAccess] = useState<UserNetworkAccess[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isNetworkDialogOpen, setIsNetworkDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [newUserData, setNewUserData] = useState({
    email: '',
    full_name: '',
    role: 'staff' as 'admin' | 'staff'
  })
  const [isCreateNetworkDialogOpen, setIsCreateNetworkDialogOpen] = useState(false)
  const [isCreatingNetwork, setIsCreatingNetwork] = useState(false)
  const [newNetworkData, setNewNetworkData] = useState({
    name: '',
    affiliate_id: '',
    api_key: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setUsers(usersData || [])

      // Load network connections
      const { data: networksData, error: networksError } = await supabase
        .from('network_connections')
        .select('*')

      if (networksError) throw networksError
      
      // Add Affluent network if it's not already in the database
      let allNetworks = networksData || []
      const affluentExists = allNetworks.some(network => network.network_type === 'affluent')
      
      // Note: Temporarily disabled hardcoded network to avoid UUID conflicts
      // Network connections should be properly set up in the database
      // if (!affluentExists) {
      //   const affluentNetwork = {
      //     id: 'affluent-network',
      //     name: 'Affluent Network', 
      //     network_type: 'affluent',
      //     is_active: true
      //   }
      //   allNetworks = [affluentNetwork, ...allNetworks]
      // }
      
      setNetworks(allNetworks)

      // Load user network access (if table exists)
      try {
        const { data: accessData, error: accessError } = await supabase
          .from('user_network_access')
          .select('*')

        if (!accessError) {
          setUserNetworkAccess(accessData || [])
        }
      } catch (error) {
        // Table might not exist yet, that's okay
        console.log('User network access table not found, will create when needed')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUserData.email) {
      toast.error('Email is required')
      return
    }

    setIsCreating(true)
    try {
      // Send invitation via API endpoint
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newUserData.email,
          full_name: newUserData.full_name,
          role: newUserData.role
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation')
      }

      toast.success('Invitation sent! User will receive an email to set their password.')
      setIsCreateDialogOpen(false)
      setNewUserData({ email: '', full_name: '', role: 'staff' })
      loadData()
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Failed to create user')
    } finally {
      setIsCreating(false)
    }
  }

  const createNetwork = async () => {
    if (!newNetworkData.name || !newNetworkData.api_key) {
      toast.error('Network name and API key are required')
      return
    }

    setIsCreatingNetwork(true)
    try {
      const { error } = await supabase
        .from('network_connections')
        .insert({
          name: newNetworkData.name,
          network_type: 'custom',
          affiliate_id: newNetworkData.affiliate_id || null,
          api_key: newNetworkData.api_key,
          is_active: true
        })

      if (error) throw error

      toast.success('Network created successfully!')
      setIsCreateNetworkDialogOpen(false)
      setNewNetworkData({ name: '', affiliate_id: '', api_key: '' })
      loadData()
    } catch (error: any) {
      console.error('Error creating network:', error)
      toast.error(error.message || 'Failed to create network')
    } finally {
      setIsCreatingNetwork(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: 'admin' | 'staff') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
      toast.success('User role updated')
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      // Delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) throw authError

      // Delete from users table
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('User deleted successfully')
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Failed to delete user')
    }
  }

  const getUserNetworkAccess = (userId: string): string[] => {
    return userNetworkAccess
      .filter(access => access.user_id === userId)
      .map(access => access.network_connection_id)
  }

  const updateUserNetworkAccess = async (userId: string, networkIds: string[]) => {
    try {
      const { data: { user: currentAdmin }, error: currentUserError } = await supabase.auth.getUser()

      if (currentUserError) {
        throw currentUserError
      }

      // First, remove all existing access
      await supabase
        .from('user_network_access')
        .delete()
        .eq('user_id', userId)

      // Then add new access
      if (networkIds.length > 0) {
        const accessRecords = networkIds.map(networkId => {
          const record: { user_id: string; network_connection_id: string; granted_by?: string } = {
            user_id: userId,
            network_connection_id: networkId
          }

          if (currentAdmin?.id) {
            record.granted_by = currentAdmin.id
          }

          return record
        })

        const { error } = await supabase
          .from('user_network_access')
          .insert(accessRecords)

        if (error) throw error
      }

      loadData()
      toast.success('Network access updated')
    } catch (error: any) {
      console.error('Error updating network access:', error)
      toast.error(error.message || 'Failed to update network access')
    }
  }

  const openNetworkDialog = (user: User) => {
    setSelectedUser(user)
    setIsNetworkDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
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

  const adminUsers = users.filter(u => u.role === 'admin')
  const managerUsers = users.filter(u => u.role === 'staff') // Staff users are "managers"
  const activeUsers = users.filter(u => true) // All users are considered active for now

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Management</h1>
          <p className="text-neutral-400">
            Manage users, permissions, and network access for your affiliate team
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              placeholder="Search users..."
              className="w-64 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 pl-10"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-gray-100">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>Create an invitation for a new user with role assignment.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={newUserData.full_name}
                    onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserData.role} onValueChange={(value: 'admin' | 'staff') => setNewUserData({ ...newUserData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    💡 An invitation email will be sent to the user. They'll set their own password via the email link.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={createUser} disabled={isCreating}>
                  {isCreating ? 'Sending Invitation...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-neutral-400 text-sm font-medium">Total Team Members</h3>
              <p className="text-3xl font-bold text-white mt-2">{users.length}</p>
              <p className="text-neutral-400 text-sm mt-1">{activeUsers.length} active</p>
            </div>
            <div className="text-blue-400">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-neutral-400 text-sm font-medium">Admins</h3>
              <p className="text-3xl font-bold text-white mt-2">{adminUsers.length}</p>
              <p className="text-neutral-400 text-sm mt-1">Full access</p>
            </div>
            <div className="text-purple-400">
              <Shield className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-neutral-400 text-sm font-medium">Managers</h3>
              <p className="text-3xl font-bold text-white mt-2">{managerUsers.length}</p>
              <p className="text-neutral-400 text-sm mt-1">Campaign access</p>
            </div>
            <div className="text-green-400">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-neutral-400 text-sm font-medium">Network Connections</h3>
              <p className="text-3xl font-bold text-white mt-2">{networks.length}</p>
              <p className="text-neutral-400 text-sm mt-1">{networks.length} total</p>
            </div>
            <div className="text-orange-400">
              <Network className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Network Connections Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-neutral-400" />
            <h3 className="text-lg font-semibold text-white">Network Connections</h3>
          </div>
          <Button 
            onClick={() => setIsCreateNetworkDialogOpen(true)}
            className="bg-white text-black hover:bg-gray-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Network
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {networks.map((network) => {
            const networkUsers = userNetworkAccess.filter(access => access.network_connection_id === network.id)
            return (
              <div key={network.id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <h3 className="text-white font-medium">{network.name}</h3>
                    <p className="text-neutral-400 text-sm">{networkUsers.length} users</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                  Active
                </Badge>
              </div>
            )
          })}
          {networks.length === 0 && (
            <div className="col-span-2 text-center py-8 text-neutral-400">
              No network connections configured
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-800">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users' 
                ? 'text-blue-400 border-blue-400' 
                : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            User Management
            <span className="ml-2 bg-neutral-800 text-white px-2 py-1 rounded text-xs">
              {users.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'permissions' 
                ? 'text-blue-400 border-blue-400' 
                : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            Network Permissions
            <span className="ml-2 bg-neutral-800 text-white px-2 py-1 rounded text-xs">
              {networks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'activity' 
                ? 'text-blue-400 border-blue-400' 
                : 'text-neutral-400 border-transparent hover:text-white'
            }`}
          >
            Activity Monitoring
            <span className="ml-2 bg-neutral-800 text-white px-2 py-1 rounded text-xs">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg">
          <div className="p-6 border-b border-neutral-800">
            <h3 className="text-lg font-semibold text-white">Team Members</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-4 px-6">
                    <input type="checkbox" className="rounded border-neutral-600 bg-neutral-800" />
                  </th>
                  <th className="text-left py-4 px-6 text-neutral-400 font-medium">User</th>
                  <th className="text-left py-4 px-6 text-neutral-400 font-medium">Role</th>
                  <th className="text-left py-4 px-6 text-neutral-400 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-neutral-400 font-medium">Networks</th>
                  <th className="text-left py-4 px-6 text-neutral-400 font-medium">Last Active</th>
                  <th className="text-right py-4 px-6 text-neutral-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userNetworks = getUserNetworkAccess(user.id)
                  return (
                    <tr key={user.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                      <td className="py-4 px-6">
                        <input type="checkbox" className="rounded border-neutral-600 bg-neutral-800" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center text-white font-medium">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.full_name || 'Unnamed'}</p>
                            <p className="text-neutral-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'text-purple-400 bg-purple-400/10' 
                            : 'text-green-400 bg-green-400/10'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            user.role === 'admin' ? 'bg-purple-400' : 'bg-green-400'
                          }`}></div>
                          {user.role === 'admin' ? 'Admin' : 'Manager'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-green-500 text-green-900 px-2 py-1 rounded text-xs font-medium">
                          Active
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <Network className="h-4 w-4 text-neutral-400" />
                          <span className="text-white text-sm">{userNetworks.length} networks</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-white text-sm">244</p>
                          <p className="text-neutral-400 text-xs">days ago</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                              <span className="text-sm font-medium mr-2">{user.role === 'admin' ? 'Admin' : 'Manager'}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700">
                            <DropdownMenuItem onClick={() => openNetworkDialog(user)} className="text-neutral-300 hover:text-white">
                              <Network className="mr-2 h-4 w-4" />
                              Manage Network Access
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-neutral-700" />
                            {user.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => updateUserRole(user.id, 'admin')} className="text-neutral-300 hover:text-white">
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            {user.role !== 'staff' && (
                              <DropdownMenuItem onClick={() => updateUserRole(user.id, 'staff')} className="text-neutral-300 hover:text-white">
                                <Users className="mr-2 h-4 w-4" />
                                Make Manager
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-neutral-700" />
                            <DropdownMenuItem 
                              onClick={() => setUserToDelete(user)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" className="ml-2 text-neutral-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Network Access Dialog */}
      {selectedUser && (
        <NetworkAccessDialog
          user={selectedUser}
          networks={networks}
          currentAccess={getUserNetworkAccess(selectedUser.id)}
          isOpen={isNetworkDialogOpen}
          onOpenChange={setIsNetworkDialogOpen}
          onSave={updateUserNetworkAccess}
        />
      )}

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              This will permanently delete their account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (userToDelete) {
                  deleteUser(userToDelete.id)
                  setUserToDelete(null)
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Network Dialog */}
      <Dialog open={isCreateNetworkDialogOpen} onOpenChange={setIsCreateNetworkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Network</DialogTitle>
            <DialogDescription>
              Connect a new affiliate network to track campaigns and manage performance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="network_name">Network Name</Label>
              <Input
                id="network_name"
                value={newNetworkData.name}
                onChange={(e) => setNewNetworkData({ ...newNetworkData, name: e.target.value })}
                placeholder="e.g., Affluent Network"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>


            <div className="grid gap-2">
              <Label htmlFor="affiliate_id">Affiliate ID (Optional)</Label>
              <Input
                id="affiliate_id"
                value={newNetworkData.affiliate_id}
                onChange={(e) => setNewNetworkData({ ...newNetworkData, affiliate_id: e.target.value })}
                placeholder="Your affiliate ID"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={newNetworkData.api_key}
                onChange={(e) => setNewNetworkData({ ...newNetworkData, api_key: e.target.value })}
                placeholder="Your network API key"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                💡 The API key will be encrypted and stored securely. It's used to fetch campaign data and performance metrics.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateNetworkDialogOpen(false)} 
              disabled={isCreatingNetwork}
            >
              Cancel
            </Button>
            <Button 
              onClick={createNetwork} 
              disabled={isCreatingNetwork}
              className="bg-white text-black hover:bg-gray-100"
            >
              {isCreatingNetwork ? 'Creating...' : 'Add Network'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NetworkAccessDialog({ user, networks, currentAccess, isOpen, onOpenChange, onSave }: NetworkAccessDialogProps) {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(currentAccess)

  const handleNetworkToggle = (networkId: string) => {
    setSelectedNetworks(prev => 
      prev.includes(networkId) 
        ? prev.filter(id => id !== networkId)
        : [...prev, networkId]
    )
  }

  const handleSave = () => {
    onSave(user.id, selectedNetworks)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Network Access</DialogTitle>
          <DialogDescription>
            Select which affiliate networks <strong>{user.full_name || user.email}</strong> can access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {networks.length > 0 ? (
            networks.map((network) => (
              <div key={network.id} className="flex items-center space-x-2">
                <Checkbox
                  id={network.id}
                  checked={selectedNetworks.includes(network.id)}
                  onCheckedChange={() => handleNetworkToggle(network.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={network.id} className="font-medium">
                    {network.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {network.network_type} network
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No affiliate networks configured. Add some networks first.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
