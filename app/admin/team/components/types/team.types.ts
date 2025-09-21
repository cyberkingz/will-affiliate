export interface TeamUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'manager' | 'analyst'
  status: 'active' | 'inactive' | 'pending'
  lastActive: Date | null
  createdAt: Date
  networkAccess: string[]
}

export interface TeamStats {
  total: number
  admins: number
  managers: number
  analysts: number
  activeUsers: number
  pendingInvitations: number
  networkConnections: {
    total: number
    active: number
  }
}

export interface NetworkConnection {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  userCount: number
}

export interface UserActivityMetrics {
  userId: string
  loginCount: number
  lastLogin: Date
  networkUsage: Record<string, number>
  actionsPerformed: number
}

export interface DateRange {
  from: Date
  to: Date
}

export interface NetworkAccessChange {
  userId: string
  networkId: string
  hasAccess: boolean
}

export interface BulkAction {
  type: 'role_change' | 'deactivate' | 'activate' | 'delete'
  userIds: string[]
  data?: any
}