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
  campaigns: string[]
  subIds: string[]
}

interface FilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableNetworks: Array<{ id: string; name: string }>
  availableCampaigns: Array<{ id: string; name: string }>
  availableSubIds: string[]
  isLoading?: boolean
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableNetworks,
  availableCampaigns,
  availableSubIds,
  isLoading = false
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [networkCampaigns, setNetworkCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const fetchCampaignsForNetwork = async (networkId: string) => {
    console.log('🎯 [FILTER-PANEL] Fetching campaigns for network:', networkId)
    setLoadingCampaigns(true)
    
    try {
      const response = await fetch(`/api/network-campaigns?network=${networkId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('📥 [FILTER-PANEL] Campaigns received:', data.campaigns?.length || 0)
        setNetworkCampaigns(data.campaigns || [])
      } else {
        console.error('❌ [FILTER-PANEL] Failed to fetch campaigns:', response.status)
        setNetworkCampaigns([])
      }
    } catch (error) {
      console.error('❌ [FILTER-PANEL] Error fetching campaigns:', error)
      setNetworkCampaigns([])
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // Fetch campaigns when Affluent network is selected (default)
  React.useEffect(() => {
    if (filters.networks.includes('affluent')) {
      fetchCampaignsForNetwork('affluent')
    } else {
      setNetworkCampaigns([])
    }
  }, [filters.networks])

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
      campaigns: [],
      subIds: []
    })
  }

  const activeFiltersCount = 
    filters.networks.length + 
    filters.campaigns.length + 
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
                  disabled={isLoading || loadingCampaigns}
                  onValueChange={(value) => {
                    if (value && !filters.campaigns.includes(value)) {
                      updateFilters({
                        campaigns: [...filters.campaigns, value]
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingCampaigns ? "Loading offers..." : 
                      networkCampaigns.length === 0 ? "No offers found" :
                      "Select offers..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {networkCampaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {filters.campaigns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {filters.campaigns.map((campaignId) => {
                      const campaign = networkCampaigns.find(c => c.id === campaignId)
                      return (
                        <Badge
                          key={campaignId}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => updateFilters({
                            campaigns: filters.campaigns.filter(id => id !== campaignId)
                          })}
                        >
                          {campaign?.name || campaignId} ×
                        </Badge>
                      )
                    })}
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