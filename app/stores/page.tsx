'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { StoresList } from '@/components/stores/stores-list'
import { AddStoreModal } from '@/components/stores/add-store-modal'
import { StoreDetailsModal } from '@/components/stores/store-details-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus } from 'lucide-react'
import type { ShopifyStore, StoreStatus } from '@/components/stores/types'
import { Database } from '@/types/supabase'

type User = Database['public']['Tables']['users']['Row']

export default function ShopifyStoresPage() {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StoreStatus | 'all'>('all')
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [showStoreDetailsModal, setShowStoreDetailsModal] = useState(false)

  // Initialize auth and fetch data
  useEffect(() => {
    const initializeAuth = async () => {
      const supabase = createClient()
      
      try {
        // Check authentication
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          // Redirect to login if not authenticated
          window.location.href = '/login'
          return
        }

        // Get user profile from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (userError) {
          console.error('Error fetching user:', userError)
          return
        }

        setUser(userData)
        
        // Debug: Log user data to verify admin role
        console.log('🔍 [DEBUG] Current user data:', userData)
        console.log('🔍 [DEBUG] User role:', userData?.role)
        console.log('🔍 [DEBUG] Is admin?', userData?.role === 'admin')
        
        // Fetch stores
        await fetchStores()
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Fetch stores from API
  const fetchStores = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/stores?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stores')
      }

      const data = await response.json()
      
      // Transform the database data to match our frontend interface
      const transformedStores: ShopifyStore[] = data.stores.map((store: Database['public']['Tables']['shopify_stores']['Row']) => ({
        id: store.id,
        storeName: store.store_name,
        storeUrl: store.store_url,
        shopifyEmail: store.shopify_email,
        shopifyPassword: store.shopify_password,
        status: store.status,
        createdAt: new Date(store.created_at),
        updatedAt: new Date(store.updated_at)
      }))

      setStores(transformedStores)
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }, [statusFilter])

  // Refetch stores when status filter changes
  useEffect(() => {
    if (user) {
      fetchStores()
    }
  }, [statusFilter, user, fetchStores])

  // Filter stores based on search and status
  const filteredStores = stores.filter(store => {
    const matchesSearch = store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         store.storeUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         store.shopifyEmail.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleAddStore = async (storeData: Omit<ShopifyStore, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: storeData.storeName,
          storeUrl: storeData.storeUrl,
          shopifyEmail: storeData.shopifyEmail,
          shopifyPassword: storeData.shopifyPassword,
          status: storeData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error creating store:', errorData)
        return
      }

      // Refresh stores list
      await fetchStores()
      setShowAddStoreModal(false)
    } catch (error) {
      console.error('Error adding store:', error)
    }
  }

  const handleDeleteStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores?id=${storeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.error('Error deleting store')
        return
      }

      // Remove from local state
      setStores(prev => prev.filter(store => store.id !== storeId))
    } catch (error) {
      console.error('Error deleting store:', error)
    }
  }

  const handleToggleStatus = async (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    if (!store) return

    const newStatus = store.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch('/api/stores', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: storeId,
          status: newStatus
        })
      })

      if (!response.ok) {
        console.error('Error updating store status')
        return
      }

      // Update local state
      setStores(prev => prev.map(store => 
        store.id === storeId 
          ? { ...store, status: newStatus, updatedAt: new Date() }
          : store
      ))
    } catch (error) {
      console.error('Error updating store status:', error)
    }
  }

  const handleViewDetails = (store: ShopifyStore) => {
    setSelectedStore(store)
    setShowStoreDetailsModal(true)
  }

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Shopify Stores</h1>
            <p className="text-neutral-400">
              Manage your connected Shopify stores and their integration status
            </p>
          </div>
          <Button
            onClick={() => setShowAddStoreModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            ADD STORE
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
            <Input
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as StoreStatus | 'all')}>
            <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-blue-400 font-medium text-sm">Quick Access to Store Credentials</h4>
              <p className="text-neutral-300 text-sm">
                Click any store row or card to expand and view store credentials inline. 
                Use the copy buttons for quick access to URLs, emails, and passwords. 
                The eye icon opens the full details modal.
              </p>
            </div>
          </div>
        </div>

        {/* Stores List */}
        <div className="min-h-[400px]">
          <StoresList
            stores={filteredStores}
            onDeleteStore={handleDeleteStore}
            onToggleStatus={handleToggleStatus}
            onViewDetails={handleViewDetails}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Add Store Modal */}
      <AddStoreModal
        open={showAddStoreModal}
        onOpenChange={setShowAddStoreModal}
        onStoreCreated={handleAddStore}
      />

      {/* Store Details Modal */}
      <StoreDetailsModal
        store={selectedStore}
        open={showStoreDetailsModal}
        onOpenChange={setShowStoreDetailsModal}
      />
    </DashboardLayout>
  )
}