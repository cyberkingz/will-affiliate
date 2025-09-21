'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Network, 
  Search,
  Shield,
  Settings
} from 'lucide-react'
import { TeamStats, NetworkConnection } from './types/team.types'

interface TeamOverviewHeaderProps {
  teamStats: TeamStats
  networkConnections: NetworkConnection[]
  onAddUser: () => void
  onSearch: (query: string) => void
}

export function TeamOverviewHeader({ 
  teamStats, 
  networkConnections, 
  onAddUser, 
  onSearch 
}: TeamOverviewHeaderProps) {
  const statsCards = [
    {
      title: 'Total Team Members',
      value: teamStats.total,
      icon: Users,
      color: 'text-blue-500',
      subtitle: `${teamStats.activeUsers} active`
    },
    {
      title: 'Admins',
      value: teamStats.admins,
      icon: Shield,
      color: 'text-purple-500',
      subtitle: 'Full access'
    },
    {
      title: 'Managers',
      value: teamStats.managers,
      icon: UserCheck,
      color: 'text-green-500',
      subtitle: 'Campaign access'
    },
    {
      title: 'Network Connections',
      value: teamStats.networkConnections.active,
      icon: Network,
      color: 'text-orange-500',
      subtitle: `${teamStats.networkConnections.total} total`
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Management</h1>
          <p className="text-neutral-400 mt-1">
            Manage users, permissions, and network access for your affiliate team
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
            <Input
              placeholder="Search team members..."
              className="pl-9 w-64 bg-neutral-800 border-neutral-700 text-white placeholder-neutral-400"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <Button onClick={onAddUser} className="bg-blue-600 hover:bg-blue-700 text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="bg-neutral-900 border-neutral-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-300">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-neutral-400 mt-1">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Network Status */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-500" />
            Network Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {networkConnections.map((network) => (
              <div
                key={network.id}
                className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    network.status === 'connected' 
                      ? 'bg-green-500' 
                      : network.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`} />
                  <div>
                    <div className="text-white font-medium">{network.name}</div>
                    <div className="text-neutral-400 text-sm">
                      {network.userCount} users
                    </div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  network.status === 'connected'
                    ? 'bg-green-500/20 text-green-400'
                    : network.status === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {network.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}