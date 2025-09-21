'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { AdminLayout } from '@/components/admin/admin-layout'

// Lazy load admin components to reduce initial bundle size
const NetworkConnectionsList = lazy(() => 
  import('@/components/admin/network-connections-list').then(module => ({
    default: module.NetworkConnectionsList
  }))
)

const NetworkConnectionForm = lazy(() => 
  import('@/components/admin/network-connection-form').then(module => ({
    default: module.NetworkConnectionForm
  }))
)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

type NetworkConnection = Database['public']['Tables']['network_connections']['Row']
type NetworkConnectionInsert = Database['public']['Tables']['network_connections']['Insert']

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<NetworkConnection[]>([])
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<NetworkConnection | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  const supabase = createClient()

  useEffect(() => {
    fetchUser()
    fetchConnections()
  }, [])

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setUser(userData)
    }
  }

  const fetchConnections = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('network_connections')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setConnections(data || [])
    } catch (error) {
      console.error('Error fetching connections:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load network connections"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (formData: NetworkConnectionInsert) => {
    setIsSubmitting(true)
    try {
      if (editingConnection) {
        // Update existing connection
        const { error } = await supabase
          .from('network_connections')
          .update(formData)
          .eq('id', editingConnection.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Network connection updated successfully"
        })
      } else {
        // Create new connection
        const { error } = await supabase
          .from('network_connections')
          .insert([formData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Network connection created successfully"
        })
      }

      setIsFormOpen(false)
      setEditingConnection(null)
      fetchConnections()
    } catch (error) {
      console.error('Error saving connection:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save network connection"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (connection: NetworkConnection) => {
    setEditingConnection(connection)
    setIsFormOpen(true)
  }

  const handleDelete = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('network_connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Network connection deleted successfully"
      })
      
      fetchConnections()
    } catch (error) {
      console.error('Error deleting connection:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete network connection"
      })
    }
  }

  const handleSync = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/sync/${connectionId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      toast({
        title: "Success",
        description: "Sync started successfully"
      })
      
      // Refresh connections to show updated sync status
      setTimeout(fetchConnections, 1000)
    } catch (error) {
      console.error('Error starting sync:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start sync"
      })
    }
  }

  const handleAdd = () => {
    setEditingConnection(null)
    setIsFormOpen(true)
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingConnection(null)
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <AdminLayout user={user}>
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-50">Network Connections</h1>
            <p className="text-neutral-300 mt-1">
              Manage your affiliate network connections and API integrations
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }>
            <NetworkConnectionsList
              connections={connections}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSync={handleSync}
              onAdd={handleAdd}
              isLoading={isLoading}
            />
          </Suspense>
        </div>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingConnection ? 'Edit Network Connection' : 'Add Network Connection'}
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }>
            <NetworkConnectionForm
              connection={editingConnection}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}