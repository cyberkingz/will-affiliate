'use client'

import { useState } from 'react'
import { CalendarIcon, Filter } from 'lucide-react'
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

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      format(filters.dateRange.from, "PPP")
                    ) : (
                      <span>Pick a date</span>
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
                    className="w-full justify-start text-left font-normal"
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? (
                      format(filters.dateRange.to, "PPP")
                    ) : (
                      <span>Pick a date</span>
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

          {/* Networks */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Networks</label>
            <Select
              disabled={isLoading}
              onValueChange={(value) => {
                if (value && !filters.networks.includes(value)) {
                  updateFilters({
                    networks: [...filters.networks, value]
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select networks..." />
              </SelectTrigger>
              <SelectContent>
                {availableNetworks.map((network) => (
                  <SelectItem key={network.id} value={network.id}>
                    {network.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {filters.networks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.networks.map((networkId) => {
                  const network = availableNetworks.find(n => n.id === networkId)
                  return (
                    <Badge
                      key={networkId}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => updateFilters({
                        networks: filters.networks.filter(id => id !== networkId)
                      })}
                    >
                      {network?.name || networkId} ×
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* Campaigns */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaigns</label>
            <Select
              disabled={isLoading}
              onValueChange={(value) => {
                if (value && !filters.campaigns.includes(value)) {
                  updateFilters({
                    campaigns: [...filters.campaigns, value]
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select campaigns..." />
              </SelectTrigger>
              <SelectContent>
                {availableCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {filters.campaigns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.campaigns.map((campaignId) => {
                  const campaign = availableCampaigns.find(c => c.id === campaignId)
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