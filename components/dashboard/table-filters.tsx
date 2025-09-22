'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, X } from 'lucide-react'

export interface TableFiltersState {
  offerName: string
  subId: string
  subId2: string
}

interface TableFiltersProps {
  filters: TableFiltersState
  onFiltersChange: (filters: TableFiltersState) => void
  availableOfferNames?: string[]
  availableSubIds?: string[]
  availableSubIds2?: string[]
}

export const TableFilters = React.memo(function TableFilters({ 
  filters, 
  onFiltersChange, 
  availableOfferNames = [],
  availableSubIds = [],
  availableSubIds2 = []
}: TableFiltersProps) {
  const handleFilterChange = (key: keyof TableFiltersState, value: string) => {
    // Convert special values back to empty strings
    let actualValue = value
    if (value === 'all') {
      actualValue = ''
    } else if (value === 'empty') {
      actualValue = ''
    }
    
    onFiltersChange({
      ...filters,
      [key]: actualValue
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      offerName: '',
      subId: '',
      subId2: ''
    })
  }

  const hasActiveFilters = filters.offerName || filters.subId || filters.subId2

  return (
    <Card className="bg-neutral-950 border-neutral-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-neutral-300">
            <Filter className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Filters</span>
          </div>
          
          {/* Filter by Offer Name */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center">
              <span className="text-xs text-white">🏷️</span>
            </div>
            <Select value={filters.offerName || 'all'} onValueChange={(value) => handleFilterChange('offerName', value)}>
              <SelectTrigger className="w-[200px] bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue placeholder="Filter by Offer Name" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="all" className="text-neutral-200">All Offers</SelectItem>
                {availableOfferNames.map((offer) => (
                  <SelectItem key={offer} value={offer} className="text-neutral-200">
                    {offer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Sub ID */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center">
              <span className="text-xs text-white">1️⃣</span>
            </div>
            <Select value={filters.subId ? (filters.subId === '' ? 'empty' : filters.subId) : 'all'} onValueChange={(value) => handleFilterChange('subId', value)}>
              <SelectTrigger className="w-[150px] bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue placeholder="Filter by Sub ID" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="all" className="text-neutral-200">All Sub IDs</SelectItem>
                {availableSubIds.map((subId, index) => (
                  <SelectItem key={index} value={subId || 'empty'} className="text-neutral-200">
                    {subId || 'Empty'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Sub ID 2 */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center">
              <span className="text-xs text-white">2️⃣</span>
            </div>
            <Select value={filters.subId2 ? (filters.subId2 === '' ? 'empty' : filters.subId2) : 'all'} onValueChange={(value) => handleFilterChange('subId2', value)}>
              <SelectTrigger className="w-[150px] bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue placeholder="Filter by Sub ID 2" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="all" className="text-neutral-200">All Sub ID 2s</SelectItem>
                {availableSubIds2.map((subId2, index) => (
                  <SelectItem key={index} value={subId2 || 'empty'} className="text-neutral-200">
                    {subId2 || 'Empty'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
            >
              <X className="w-4 h-4 mr-1" />
              CLEAR FILTERS
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
