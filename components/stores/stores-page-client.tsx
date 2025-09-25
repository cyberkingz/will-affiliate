'use client'

import { useState, useEffect, useCallback } from 'react'
import { StoresList } from '@/components/stores/stores-list'
import { AddStoreModal } from '@/components/stores/add-store-modal'
import { StoreDetailsModal } from '@/components/stores/store-details-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus } from 'lucide-react'
import type { ShopifyStore, StoreStatus } from '@/components/stores/types'
import { Database } from '@/types/supabase'
import { useDashboardUser } from '@/components/dashboard/dashboard-user-context'

const transformStore = (store: Database['public']['Tables']['shopify_stores']['Row']): ShopifyStore => ({
  id: store.id,
  storeName: store.store_name,
  storeUrl: store.store_url,
  shopifyEmail: store.shopify_email,
  shopifyPassword: store.shopify_password,
  status: store.status,
  createdAt: new Date(store.created_at),
  updatedAt: new Date(store.updated_at)
})

export function StoresPageClient() {
  useDashboardUser() // ensure authenticated (value unused for now)

  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StoreStatus | 'all'>('all')
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [showStoreDetailsModal, setShowStoreDetailsModal] = useState(false)

  const fetchStores = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/stores?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stores')
      }

      const data = await response.json()
      const transformedStores: ShopifyStore[] = data.stores.map(transformStore)
      setStores(transformedStores)
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }, [statusFilter])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await fetchStores()
      setIsLoading(false)
    }

    load()
  }, [fetchStores])

  const filteredStores = stores.filter((store) => {
    const search = searchQuery.toLowerCase()
    const matchesSearch =
      store.storeName.toLowerCase().includes(search) ||
      store.storeUrl.toLowerCase().includes(search) ||
      store.shopifyEmail.toLowerCase().includes(search)

    const matchesStatus = statusFilter === 'all' || store.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleAddStore = async (
    storeData: Omit<ShopifyStore, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      await fetchStores()
      setShowAddStoreModal(false)
    } catch (error) {
      console.error('Error adding store:', error)
    }
  }

  const handleDeleteStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores?id=${storeId}`, { method: 'DELETE' })
      if (!response.ok) {
        console.error('Error deleting store')
        return
      }

      setStores((prev) => prev.filter((store) => store.id !== storeId))
    } catch (error) {
      console.error('Error deleting store:', error)
    }
  }

  const handleToggleStatus = async (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    if (!store) return

    const newStatus = store.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch('/api/stores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storeId, status: newStatus })
      })

      if (!response.ok) {
        console.error('Error updating store status')
        return
      }

      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId ? { ...s, status: newStatus, updatedAt: new Date() } : s
        )
      )
    } catch (error) {
      console.error('Error updating store status:', error)
    }
  }

  const handleViewDetails = (store: ShopifyStore) => {
    setSelectedStore(store)
    setShowStoreDetailsModal(true)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Shopify Stores</h1>
            <p className="text-neutral-400 mt-2">Connect and manage your Shopify stores and data syncs</p>
          </div>
          <Button disabled className="bg-white text-black hover:bg-gray-100">
            <Plus className="h-4 w-4 mr-2" />
            Add Store
          </Button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-6 w-48 bg-neutral-800 rounded" />
                    <div className="h-4 w-64 bg-neutral-800 rounded" />
                  </div>
                  <div className="h-8 w-24 bg-neutral-800 rounded" />
                </div>
                <div className="mt-4 grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-4 bg-neutral-800 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Shopify Stores</h1>
          <p className="text-neutral-400">Manage your connected Shopify stores and their integration status</p>
        </div>
        <Button onClick={() => setShowAddStoreModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          ADD STORE
        </Button>
      </div>

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
        <Select
          value={statusFilter}
          onValueChange={(value: string) => setStatusFilter(value as StoreStatus | 'all')}
        >
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

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl">
        <StoresList
          stores={filteredStores}
          onDeleteStore={handleDeleteStore}
          onToggleStatus={handleToggleStatus}
          onViewDetails={handleViewDetails}
          searchQuery={searchQuery}
        />
      </div>

      <AddStoreModal
        open={showAddStoreModal}
        onOpenChange={setShowAddStoreModal}
        onStoreCreated={handleAddStore}
      />

      <StoreDetailsModal
        store={selectedStore}
        open={showStoreDetailsModal}
        onOpenChange={setShowStoreDetailsModal}
      />
    </div>
  )
}
