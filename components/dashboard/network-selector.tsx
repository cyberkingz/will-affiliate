'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network, Check, AlertCircle } from 'lucide-react'

interface NetworkOption {
  id: string
  name: string
  status?: string
}

interface NetworkSelectorProps {
  availableNetworks: NetworkOption[]
  onNetworksSelected: (networkIds: string[]) => void
  allowMultiple?: boolean
}

export function NetworkSelector({ 
  availableNetworks, 
  onNetworksSelected, 
  allowMultiple = false 
}: NetworkSelectorProps) {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])

  const handleNetworkToggle = (networkId: string) => {
    if (allowMultiple) {
      setSelectedNetworks(prev =>
        prev.includes(networkId)
          ? prev.filter(id => id !== networkId)
          : [...prev, networkId]
      )
      return
    }

    setSelectedNetworks(prev =>
      prev.includes(networkId) ? [] : [networkId]
    )
  }

  const handleContinue = () => {
    if (selectedNetworks.length > 0) {
      onNetworksSelected(selectedNetworks)
    }
  }

  if (availableNetworks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full bg-neutral-900/50 border-neutral-800">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-neutral-400" />
            </div>
            <CardTitle>No Networks Available</CardTitle>
            <CardDescription>
              You don't have access to any networks yet. Contact your administrator to get network access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <Card className="max-w-2xl w-full bg-neutral-900/50 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <CardTitle className="text-xl">Select Network</CardTitle>
              <CardDescription>
                Choose a network to view your affiliate analytics
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {availableNetworks.map((network) => {
              const isSelected = selectedNetworks.includes(network.id)
              const isActive = network.status === 'active'
              
              return (
                <div
                  key={network.id}
                  onClick={() => handleNetworkToggle(network.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-neutral-800/80 border-green-500/50 ring-1 ring-green-500/20' 
                      : 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800/50 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="font-medium text-white">{network.name}</span>
                      <Badge variant="secondary" className={`text-xs ${
                        isActive 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {isActive ? 'Active' : 'Setup Required'}
                      </Badge>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 space-y-4">
            <Button 
              onClick={handleContinue}
              disabled={selectedNetworks.length === 0}
              className="w-full bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedNetworks.length === 0 
                ? 'Select a Network to Continue' 
                : `Continue with ${selectedNetworks.length} Network${selectedNetworks.length > 1 ? 's' : ''}`
              }
            </Button>
            
            {allowMultiple && (
              <p className="text-center text-xs text-neutral-500">
                You can select multiple networks to compare performance
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}