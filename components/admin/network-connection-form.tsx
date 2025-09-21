'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database } from '@/types/supabase'

type NetworkConnection = Database['public']['Tables']['network_connections']['Row']
type NetworkConnectionInsert = Database['public']['Tables']['network_connections']['Insert']

interface NetworkConnectionFormProps {
  connection?: NetworkConnection
  onSubmit: (data: NetworkConnectionInsert) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const NETWORK_TYPES = [
  { value: 'clickbank', label: 'ClickBank' },
  { value: 'cj', label: 'Commission Junction' },
  { value: 'shareassale', label: 'ShareASale' },
  { value: 'rakuten', label: 'Rakuten Advertising' },
  { value: 'impact', label: 'Impact' },
  { value: 'maxbounty', label: 'MaxBounty' },
  { value: 'peerfly', label: 'PeerFly' },
  { value: 'custom', label: 'Custom Network' }
]

export function NetworkConnectionForm({ 
  connection, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: NetworkConnectionFormProps) {
  const [formData, setFormData] = useState<NetworkConnectionInsert>({
    name: connection?.name || '',
    network_type: connection?.network_type || '',
    affiliate_id: connection?.affiliate_id || '',
    api_key: connection?.api_key || '',
    is_active: connection?.is_active ?? true,
  })
  
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.network_type) {
      setError('Name and network type are required')
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const updateFormData = (field: keyof NetworkConnectionInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {connection ? 'Edit Network Connection' : 'Add Network Connection'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., ClickBank Main Account"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="network_type">Network Type</Label>
              <Select
                value={formData.network_type}
                onValueChange={(value) => updateFormData('network_type', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network type" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="affiliate_id">Affiliate ID</Label>
              <Input
                id="affiliate_id"
                value={formData.affiliate_id || ''}
                onChange={(e) => updateFormData('affiliate_id', e.target.value)}
                placeholder="Your affiliate ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={formData.api_key || ''}
                onChange={(e) => updateFormData('api_key', e.target.value)}
                placeholder="API key for data sync"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => updateFormData('is_active', checked)}
            />
            <Label htmlFor="is_active">Active Connection</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : connection ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}