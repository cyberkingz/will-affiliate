'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { 
  MoreHorizontal, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { Database } from '@/types/supabase'

type NetworkConnection = Database['public']['Tables']['network_connections']['Row']

interface NetworkConnectionsListProps {
  connections: NetworkConnection[]
  onEdit: (connection: NetworkConnection) => void
  onDelete: (connectionId: string) => Promise<void>
  onSync: (connectionId: string) => Promise<void>
  onAdd: () => void
  isLoading?: boolean
}

export function NetworkConnectionsList({
  connections,
  onEdit,
  onDelete,
  onSync,
  onAdd,
  isLoading = false
}: NetworkConnectionsListProps) {
  const [deleteConnectionId, setDeleteConnectionId] = useState<string | null>(null)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  const handleDelete = async (connectionId: string) => {
    try {
      await onDelete(connectionId)
      setDeleteConnectionId(null)
    } catch (error) {
      console.error('Error deleting connection:', error)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncingIds(prev => new Set(prev).add(connectionId))
    try {
      await onSync(connectionId)
    } catch (error) {
      console.error('Error syncing connection:', error)
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(connectionId)
        return newSet
      })
    }
  }

  const getStatusIcon = (connection: NetworkConnection) => {
    if (!connection.is_active) {
      return <XCircle className="h-4 w-4 text-gray-400" />
    }
    
    switch (connection.last_sync_status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (connection: NetworkConnection) => {
    if (!connection.is_active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    
    switch (connection.last_sync_status) {
      case 'success':
        return <Badge variant="default">Synced</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'pending':
        return <Badge variant="secondary">Syncing</Badge>
      default:
        return <Badge variant="outline">Not Synced</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Network Connections</CardTitle>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No network connections configured</p>
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Connection
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(connection)}
                    <div>
                      <div className="font-medium">{connection.name}</div>
                      <div className="text-sm text-gray-500 capitalize">
                        {connection.network_type.replace('_', ' ')}
                      </div>
                      {connection.last_sync_at && (
                        <div className="text-xs text-gray-400">
                          Last sync: {new Date(connection.last_sync_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusBadge(connection)}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncingIds.has(connection.id) || !connection.is_active}
                    >
                      <RefreshCw 
                        className={`h-4 w-4 ${syncingIds.has(connection.id) ? 'animate-spin' : ''}`} 
                      />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(connection)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConnectionId(connection.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConnectionId} onOpenChange={() => setDeleteConnectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the network connection
              and remove all associated campaign data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConnectionId && handleDelete(deleteConnectionId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}