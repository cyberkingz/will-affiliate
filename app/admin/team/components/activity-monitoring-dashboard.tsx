'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Clock, Eye, Download, Filter } from 'lucide-react'
import { TeamUser, DateRange } from './types/team.types'

interface ActivityMonitoringDashboardProps {
  users: TeamUser[]
  selectedUserId: string | null
  onUserSelect: (userId: string) => void
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function ActivityMonitoringDashboard({
  users,
  selectedUserId,
  onUserSelect,
  dateRange,
  onDateRangeChange
}: ActivityMonitoringDashboardProps) {
  const mockActivityData = [
    { time: '09:00', user: 'John Admin', action: 'Logged in', details: 'Dashboard access' },
    { time: '09:15', user: 'Sarah Manager', action: 'Viewed reports', details: 'Campaign analytics' },
    { time: '10:30', user: 'Mike Analyst', action: 'Downloaded data', details: 'Click report export' },
    { time: '11:45', user: 'John Admin', action: 'Modified permissions', details: 'Updated user role' },
    { time: '14:20', user: 'Sarah Manager', action: 'Accessed network', details: 'Affluent API connection' }
  ]

  return (
    <div className="space-y-6">
      {/* Activity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Total Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">127</div>
            <p className="text-xs text-neutral-400 mt-1">actions today</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Active Users
            </CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{users.filter(u => u.status === 'active').length}</div>
            <p className="text-xs text-neutral-400 mt-1">out of {users.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-neutral-300">
              Peak Activity
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">10:30 AM</div>
            <p className="text-xs text-neutral-400 mt-1">highest usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Activity Log</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedUserId || 'all'} onValueChange={(value) => value !== 'all' && onUserSelect(value)}>
                <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="all" className="text-neutral-300">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-neutral-300">
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockActivityData.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-neutral-400 text-sm w-16">{activity.time}</div>
                  <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {activity.user.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{activity.user}</div>
                    <div className="text-neutral-400 text-sm">{activity.action}</div>
                  </div>
                </div>
                <div className="text-neutral-400 text-sm">{activity.details}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}