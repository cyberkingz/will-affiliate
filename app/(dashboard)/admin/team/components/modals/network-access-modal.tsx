'use client'

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TeamUser, NetworkConnection } from '../types/team.types'

type NetworkPermissions = Record<string, boolean>

interface NetworkAccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: TeamUser | null
  availableNetworks: NetworkConnection[]
  onSave: (permissions: NetworkPermissions) => void
}

export function NetworkAccessModal({
  open,
  onOpenChange,
  user,
  availableNetworks,
  onSave
}: NetworkAccessModalProps) {
  const [networkPermissions, setNetworkPermissions] = useState<NetworkPermissions>({})

  useEffect(() => {
    if (user) {
      const initialPermissions = availableNetworks.reduce<NetworkPermissions>((acc, network) => {
        acc[network.id] = user.networkAccess.includes(network.id)
        return acc
      }, {})
      setNetworkPermissions(initialPermissions)
    }
  }, [user, availableNetworks])

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle>Network Access - {user.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {availableNetworks.map((network) => (
            <div key={network.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
              <div>
                <div className="font-medium">{network.name}</div>
                <div className="text-sm text-neutral-400">Network access permissions</div>
              </div>
              <Switch
                checked={networkPermissions[network.id] ?? false}
                onCheckedChange={(checked) =>
                  setNetworkPermissions(prev => ({
                    ...prev,
                    [network.id]: checked === true
                  }))
                }
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSave(networkPermissions)}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
