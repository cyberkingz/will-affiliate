'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  MoreHorizontal, 
  Trash2, 
  Shield, 
  User, 
  UserCheck,
  Clock,
  Network
} from 'lucide-react'
import { TeamUser } from './types/team.types'

type UserRole = TeamUser['role']

const isUserRole = (value: string): value is UserRole => {
  return value === 'admin' || value === 'manager' || value === 'analyst'
}

interface UserManagementTableProps {
  users: TeamUser[]
  onUserSelect: (userId: string) => void
  onBulkAction: (action: string, userIds: string[]) => void
  onRoleChange: (userId: string, newRole: 'admin' | 'manager' | 'analyst') => void
  selectedUsers: string[]
  onSelectedUsersChange: (userIds: string[]) => void
  loading: boolean
}

export function UserManagementTable({
  users,
  onUserSelect,
  onBulkAction,
  onRoleChange,
  selectedUsers,
  onSelectedUsersChange,
  loading
}: UserManagementTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedUsersChange(users.map(u => u.id))
    } else {
      onSelectedUsersChange([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectedUsersChange([...selectedUsers, userId])
    } else {
      onSelectedUsersChange(selectedUsers.filter(id => id !== userId))
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-500" />
      case 'manager':
        return <UserCheck className="h-4 w-4 text-green-500" />
      case 'analyst':
        return <User className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-neutral-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20">Active</Badge>
      case 'inactive':
        return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/20">Inactive</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20">Pending</Badge>
      default:
        return <Badge className="bg-neutral-500/20 text-neutral-400 hover:bg-neutral-500/20">Unknown</Badge>
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  if (loading) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">Loading team members...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-neutral-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Team Members</CardTitle>
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">
                {selectedUsers.length} selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onBulkAction('deactivate', selectedUsers)}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                Deactivate
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onBulkAction('delete', selectedUsers)}
                className="border-red-700 text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-3 bg-neutral-800 rounded-lg text-sm font-medium text-neutral-300">
            <div className="col-span-1 flex items-center">
              <Checkbox
                checked={selectedUsers.length === users.length}
                onCheckedChange={handleSelectAll}
              />
            </div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Networks</div>
            <div className="col-span-2">Last Active</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-4 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                onClick={() => onUserSelect(user.id)}
              >
                <div className="col-span-1 flex items-center">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked === true)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{user.fullName}</div>
                    <div className="text-neutral-400 text-sm">{user.email}</div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  {getRoleIcon(user.role)}
                  <span className="text-white capitalize">{user.role}</span>
                </div>

                <div className="col-span-2 flex items-center">
                  {getStatusBadge(user.status)}
                </div>

                <div className="col-span-2 flex items-center gap-1">
                  <Network className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-300">{user.networkAccess.length}</span>
                  <span className="text-neutral-500 text-sm">networks</span>
                </div>

                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-400 text-sm">
                    <Clock className="h-4 w-4" />
                    {formatDate(user.lastActive)}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => {
                        if (isUserRole(newRole)) {
                          onRoleChange(user.id, newRole)
                        }
                      }}
                    >
                      <SelectTrigger className="w-24 h-8 bg-transparent border-neutral-600 text-neutral-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value="admin" className="text-neutral-300 hover:bg-neutral-700">Admin</SelectItem>
                        <SelectItem value="manager" className="text-neutral-300 hover:bg-neutral-700">Manager</SelectItem>
                        <SelectItem value="analyst" className="text-neutral-300 hover:bg-neutral-700">Analyst</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle more actions
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
              <div className="text-neutral-400 text-lg mb-2">No team members found</div>
              <div className="text-neutral-500 text-sm">Start by adding your first team member</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
