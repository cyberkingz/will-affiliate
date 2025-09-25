'use client'

import { useMemo, useState } from 'react'
import { TeamOverviewHeader } from './components/team-overview-header'
import { UserManagementTable } from './components/user-management-table'
import { PermissionMatrix } from './components/permission-matrix'
import { ActivityMonitoringDashboard } from './components/activity-monitoring-dashboard'
import { AddUserModal } from './components/modals/add-user-modal'
import type { AddUserFormData } from './components/modals/add-user-modal'
import { NetworkAccessModal } from './components/modals/network-access-modal'
import { UserActivityModal } from './components/modals/user-activity-modal'
import { TeamUser, TeamStats, NetworkConnection } from './components/types/team.types'

type TabId = 'users' | 'permissions' | 'activity'

const mockUsers: TeamUser[] = [
  {
    id: '1',
    email: 'admin@willaffiliate.com',
    fullName: 'John Admin',
    role: 'admin',
    status: 'active',
    lastActive: new Date('2025-01-21T10:30:00'),
    createdAt: new Date('2025-01-01T09:00:00'),
    networkAccess: ['affluent', 'clickbank']
  },
  {
    id: '2',
    email: 'manager@willaffiliate.com',
    fullName: 'Sarah Manager',
    role: 'manager',
    status: 'active',
    lastActive: new Date('2025-01-21T09:15:00'),
    createdAt: new Date('2025-01-10T14:30:00'),
    networkAccess: ['affluent']
  },
  {
    id: '3',
    email: 'analyst@willaffiliate.com',
    fullName: 'Mike Analyst',
    role: 'analyst',
    status: 'active',
    lastActive: new Date('2025-01-20T16:45:00'),
    createdAt: new Date('2025-01-15T11:00:00'),
    networkAccess: ['affluent']
  },
  {
    id: '4',
    email: 'pending@willaffiliate.com',
    fullName: 'Jane Pending',
    role: 'analyst',
    status: 'pending',
    lastActive: null,
    createdAt: new Date('2025-01-20T15:00:00'),
    networkAccess: []
  }
]

const mockTeamStats: TeamStats = {
  total: 4,
  admins: 1,
  managers: 1,
  analysts: 2,
  activeUsers: 3,
  pendingInvitations: 1,
  networkConnections: {
    total: 2,
    active: 2
  }
}

const mockNetworks: NetworkConnection[] = [
  { id: 'affluent', name: 'Affluent', status: 'connected', userCount: 4 },
  { id: 'clickbank', name: 'ClickBank', status: 'connected', userCount: 1 }
]

export default function TeamManagementPage() {
  const [users, setUsers] = useState<TeamUser[]>(mockUsers)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('users')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showNetworkAccessModal, setShowNetworkAccessModal] = useState(false)
  const [showUserActivityModal, setShowUserActivityModal] = useState(false)

  const handleBulkAction = (action: string, userIds: string[]) => {
    console.log('Bulk action:', action, userIds)
  }

  const handleRoleChange = (userId: string, newRole: 'admin' | 'manager' | 'analyst') => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
  }

  const handleUserCreated = (userData: AddUserFormData) => {
    console.log('User created:', userData)
    setShowAddUserModal(false)
  }

  const handleAddUser = () => setShowAddUserModal(true)

  const selectedUser = useMemo(
    () => (selectedUserId ? users.find((user) => user.id === selectedUserId) ?? null : null),
    [selectedUserId, users]
  )

  const tabConfig = useMemo(
    () => (
      [
        { id: 'users', label: 'User Management', count: users.length },
        { id: 'permissions', label: 'Network Permissions', count: mockNetworks.length },
        { id: 'activity', label: 'Activity Monitoring', count: users.filter((u) => u.status === 'active').length }
      ] as Array<{ id: TabId; label: string; count: number }>
    ),
    [users]
  )

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <TeamOverviewHeader
        teamStats={mockTeamStats}
        networkConnections={mockNetworks}
        onAddUser={handleAddUser}
        onSearch={(query) => console.log('Search:', query)}
      />

      <div className="border-b border-neutral-800">
        <nav className="-mb-px flex space-x-8">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-neutral-800 text-neutral-300 py-1 px-2 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'users' && (
          <UserManagementTable
            users={users}
            onUserSelect={(userId) => {
              setSelectedUserId(userId)
              setShowNetworkAccessModal(true)
            }}
            onBulkAction={handleBulkAction}
            onRoleChange={handleRoleChange}
            selectedUsers={selectedUsers}
            onSelectedUsersChange={setSelectedUsers}
            loading={false}
          />
        )}

        {activeTab === 'permissions' && selectedUserId && selectedUser && (
          <PermissionMatrix
            userId={selectedUserId}
            user={selectedUser}
            availableNetworks={mockNetworks}
            onNetworkAccessChange={(userId, networkId, hasAccess) => {
              setUsers((prev) =>
                prev.map((user) => {
                  if (user.id !== userId) return user
                  return {
                    ...user,
                    networkAccess: hasAccess
                      ? [...user.networkAccess, networkId]
                      : user.networkAccess.filter((id) => id !== networkId)
                  }
                })
              )
            }}
          />
        )}

        {activeTab === 'permissions' && !selectedUserId && (
          <div className="text-center py-12">
            <div className="text-neutral-400 text-lg mb-2">Select a user to manage network permissions</div>
            <div className="text-neutral-500 text-sm">Choose a user from the Users tab to view and edit their network access.</div>
          </div>
        )}

        {activeTab === 'activity' && (
          <ActivityMonitoringDashboard
            users={users}
            selectedUserId={selectedUserId}
            onUserSelect={setSelectedUserId}
          />
        )}
      </div>

      <AddUserModal
        open={showAddUserModal}
        onOpenChange={setShowAddUserModal}
        availableNetworks={mockNetworks}
        onUserCreated={handleUserCreated}
      />

      <NetworkAccessModal
        open={showNetworkAccessModal}
        onOpenChange={setShowNetworkAccessModal}
        user={selectedUser}
        availableNetworks={mockNetworks}
        onSave={() => setShowNetworkAccessModal(false)}
      />

      <UserActivityModal
        open={showUserActivityModal}
        onOpenChange={setShowUserActivityModal}
        user={selectedUser}
        onClose={() => setShowUserActivityModal(false)}
      />
    </div>
  )
}
