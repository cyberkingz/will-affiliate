'use client'

import React, { useState } from 'react'
import { CalendarIcon, Filter, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { dateTemplates, getDateRangeLabel, applyDateTemplate } from '@/lib/utils/date-templates'

export interface FilterState {
  dateRange: {
    from: Date
    to: Date
  }
  networks: string[]
  offers: string[]  // Changed from campaigns to offers
  subIds: string[]
}

interface FilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableNetworks: Array<{ id: string; name: string }>
  availableOffers: Array<{ id: string; name: string }>
  availableSubIds: string[]
  isLoading?: boolean
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableNetworks,
  availableOffers,
  availableSubIds,
  isLoading = false
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [networkOffers, setNetworkOffers] = useState<Array<{ id: string; name: string }>>([])
  const [loadingOffers, setLoadingOffers] = useState(false)

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const fetchOffersForNetwork = async (networkId: string) => {
    console.log('🎯 [FILTER-PANEL] Starting to fetch offers for network:', networkId)
    console.log('🔧 [FILTER-PANEL] Setting loading state to true...')
    setLoadingOffers(true)
    
    try {
      const response = await fetch(`/api/network-campaigns?network=${networkId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('📥 [FILTER-PANEL] Offers received:', data.campaigns?.length || 0)
        console.log('🔍 [FILTER-PANEL] Full API response data:', data)
        console.log('📋 [FILTER-PANEL] Individual offers:', data.campaigns)
        
        // Log structure of first offer to understand data format
        if (data.campaigns && data.campaigns.length > 0) {
          console.log('🎯 [FILTER-PANEL] First offer structure:', data.campaigns[0])
          console.log('📊 [FILTER-PANEL] All offer IDs and names:')
          data.campaigns.forEach((offer, index) => {
            console.log(`  ${index + 1}. ID: ${offer.id}, Name: ${offer.name}, Campaign ID: ${offer.campaignId || 'N/A'}`)
          })
        }
        
        setNetworkOffers(data.campaigns || [])
      } else {
        console.error('❌ [FILTER-PANEL] Failed to fetch offers:', response.status)
        setNetworkOffers([])
      }
    } catch (error) {
      console.error('❌ [FILTER-PANEL] Error fetching offers:', error)
      setNetworkOffers([])
    } finally {
      setLoadingOffers(false)
    }
  }

  // Fetch offers when Affluent network is selected (default)
  React.useEffect(() => {
    console.log('🔄 [FILTER-PANEL] Networks changed:', filters.networks)
    if (filters.networks.includes('affluent')) {
      console.log('✅ [FILTER-PANEL] Affluent network found, fetching offers...')
      fetchOffersForNetwork('affluent')
    } else {
      console.log('❌ [FILTER-PANEL] Affluent network not found, clearing offers')
      setNetworkOffers([])
    }
  }, [filters.networks])

  // Also fetch on component mount if affluent is already selected
  React.useEffect(() => {
    console.log('🚀 [FILTER-PANEL] Component mounted, initial networks:', filters.networks)
    if (filters.networks.includes('affluent')) {
      console.log('✅ [FILTER-PANEL] Affluent network already selected on mount, fetching offers...')
      fetchOffersForNetwork('affluent')
    }
  }, [])

  const applyTemplate = (templateId: string) => {
    const dateRange = applyDateTemplate(templateId)
    if (dateRange) {
      updateFilters({ dateRange })
    }
  }

  const clearFilters = () => {
    onFiltersChange({
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date()
      },
      networks: [],
      offers: [],
      subIds: []
    })
  }

  const activeFiltersCount = 
    filters.networks.length + 
    filters.offers.length + 
    filters.subIds.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Date Range</label>
            
            {/* Current Date Range Display */}
            <div className="flex items-center space-x-2 p-3 bg-neutral-900 rounded-lg border">
              <CalendarIcon className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-200">
                {getDateRangeLabel(filters.dateRange.from, filters.dateRange.to)}
              </span>
            </div>

            {/* Date Templates */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-neutral-400" />
                <span className="text-xs font-medium text-neutral-300">Quick Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dateTemplates.slice(0, 6).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-200"
                    onClick={() => applyTemplate(template.id)}
                    disabled={isLoading}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
              
              {/* More Templates */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    More Options...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2">
                  <div className="grid gap-1">
                    {dateTemplates.slice(6).map((template) => (
                      <Button
                        key={template.id}
                        variant="ghost"
                        size="sm"
                        className="justify-start text-xs h-8"
                        onClick={() => {
                          applyTemplate(template.id)
                        }}
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Custom Date Range */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-300">Custom Range</span>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-left font-normal text-xs h-8 bg-neutral-800 border-neutral-700"
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {filters.dateRange.from ? (
                        format(filters.dateRange.from, "MMM dd")
                      ) : (
                        <span>From</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => date && updateFilters({
                        dateRange: { ...filters.dateRange, from: date }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-left font-normal text-xs h-8 bg-neutral-800 border-neutral-700"
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {filters.dateRange.to ? (
                        format(filters.dateRange.to, "MMM dd")
                      ) : (
                        <span>To</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => date && updateFilters({
                        dateRange: { ...filters.dateRange, to: date }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Networks */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Network</label>
            <div className="flex items-center space-x-2 p-3 bg-neutral-900 rounded-lg border">
              <span className="text-sm font-medium text-neutral-200">
                Affluent Network
              </span>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>
            <p className="text-xs text-neutral-400">
              Connected to affiliate ID: 208409
            </p>
          </div>

          {/* Campaigns */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Offers</label>
            <p className="text-xs text-neutral-400">
              Choose an offer to track
            </p>
            {!filters.networks.includes('affluent') ? (
              <div className="p-3 bg-neutral-800 rounded-lg border text-sm text-neutral-400">
                Select Affluent network to load offers
              </div>
            ) : (
              <>
                <Select
                  disabled={isLoading || loadingOffers}
                  onValueChange={(value) => {
                    if (value && !filters.offers.includes(value)) {
                      updateFilters({
                        offers: [...filters.offers, value]
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingOffers ? "Loading offers..." : 
                      networkOffers.length === 0 ? "No offers found" :
                      "Select offers..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {networkOffers.map((offer) => (
                      <SelectItem key={offer.id} value={offer.id}>
                        {offer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {filters.offers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {filters.offers.map((offerId) => {
                      const offer = networkOffers.find(c => c.id === offerId)
                      return (
                        <Badge
                          key={offerId}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => updateFilters({
                            offers: filters.offers.filter(id => id !== offerId)
                          })}
                        >
                          {offer?.name || offerId} ×
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sub IDs */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sub IDs</label>
            <p className="text-xs text-neutral-400">
              Filter by specific sub IDs from your campaigns
            </p>
            {availableSubIds.length === 0 ? (
              <div className="p-3 bg-neutral-800 rounded-lg border text-sm text-neutral-400">
                No sub IDs found for the current date range
              </div>
            ) : (
              <>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) => {
                    if (value && !filters.subIds.includes(value)) {
                      updateFilters({
                        subIds: [...filters.subIds, value]
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub IDs..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubIds.map((subId) => (
                      <SelectItem key={subId} value={subId}>
                        {subId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {filters.subIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {filters.subIds.map((subId) => (
                      <Badge
                        key={subId}
                        variant="secondary"
                        className="text-xs cursor-pointer"
                        onClick={() => updateFilters({
                          subIds: filters.subIds.filter(id => id !== subId)
                        })}
                      >
                        {subId} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
            <Button size="sm" onClick={() => setIsOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}