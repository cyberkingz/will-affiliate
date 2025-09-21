'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Shield, Network, BarChart3, Settings, Users, Eye } from 'lucide-react'
import { TeamUser, NetworkConnection, NetworkAccessChange } from './types/team.types'

interface PermissionMatrixProps {
  userId: string
  user: TeamUser
  availableNetworks: NetworkConnection[]
  onNetworkAccessChange: (userId: string, networkId: string, hasAccess: boolean) => void
}

export function PermissionMatrix({
  userId,
  user,
  availableNetworks,
  onNetworkAccessChange
}: PermissionMatrixProps) {

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400'
      case 'manager':
        return 'bg-green-500/20 text-green-400'
      case 'analyst':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-neutral-500/20 text-neutral-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* User Header */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-white">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{user.fullName}</h3>
                <p className="text-neutral-400">{user.email}</p>
              </div>
            </div>
            <Badge className={getRoleColor(user.role)}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Network Access */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-500" />
            Affiliate Network Access
          </CardTitle>
          <p className="text-neutral-400 text-sm mt-2">
            Control which affiliate networks {user.fullName} can access and manage campaigns for.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {availableNetworks.map((network) => {
              const hasAccess = user.networkAccess.includes(network.id)
              return (
                <div
                  key={network.id}
                  className="flex items-center justify-between p-6 bg-neutral-800 rounded-lg border border-neutral-700"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${
                      network.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="text-white font-semibold text-lg">{network.name}</div>
                      <div className="text-neutral-400 text-sm">
                        {network.userCount} team members have access • Status: {network.status}
                      </div>
                      <div className="text-neutral-500 text-xs mt-1">
                        Access to campaigns, analytics, and reporting data
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-neutral-400">
                        {hasAccess ? 'Access Granted' : 'No Access'}
                      </div>
                    </div>
                    <Switch
                      checked={hasAccess}
                      onCheckedChange={(checked) => onNetworkAccessChange(userId, network.id, checked)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>
              )
            })}
          </div>
          
          {availableNetworks.length === 0 && (
            <div className="text-center py-8">
              <Network className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
              <div className="text-neutral-400 text-lg mb-2">No networks available</div>
              <div className="text-neutral-500 text-sm">Connect affiliate networks to manage user access</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}