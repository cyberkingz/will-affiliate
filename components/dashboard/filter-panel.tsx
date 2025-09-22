'use client'

import React, { useState, useId } from 'react'
import { CalendarIcon, Settings2, X, Check, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import type { DateRange } from 'react-day-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  const [isEditMode, setIsEditMode] = useState(false)
  const [networkOffers, setNetworkOffers] = useState<Array<{ id: string; name: string }>>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [selectedDateTemplate, setSelectedDateTemplate] = useState<string | undefined>()
  
  // Generate stable IDs for accessibility
  const dateRangeId = useId()
  const networkId = useId()
  const offersId = useId()
  const subIdsId = useId()

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  // Check if current date range matches any template
  React.useEffect(() => {
    const matchingTemplate = dateTemplates.find(template => {
      const templateRange = template.getValue()
      const isSameFrom = Math.abs(templateRange.from.getTime() - filters.dateRange.from.getTime()) < 1000
      const isSameTo = Math.abs(templateRange.to.getTime() - filters.dateRange.to.getTime()) < 1000
      return isSameFrom && isSameTo
    })
    setSelectedDateTemplate(matchingTemplate?.id)
  }, [filters.dateRange])

  const fetchOffersForNetwork = async (networkId: string) => {
    setLoadingOffers(true)
    
    try {
      const response = await fetch(`/api/network-campaigns?network=${networkId}`)
      if (response.ok) {
        const data = await response.json()
        setNetworkOffers(data.campaigns || [])
      } else {
        setNetworkOffers([])
      }
    } catch {
      setNetworkOffers([])
    } finally {
      setLoadingOffers(false)
    }
  }

  // Fetch offers when networks change
  React.useEffect(() => {
    if (filters.networks.length > 0) {
      // For now, fetch for the first selected network
      fetchOffersForNetwork(filters.networks[0])
    } else {
      setNetworkOffers([])
    }
  }, [filters.networks])

  const applyTemplate = (templateId: string) => {
    const dateRange = applyDateTemplate(templateId)
    if (dateRange) {
      updateFilters({ dateRange })
      setSelectedDateTemplate(templateId)
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      updateFilters({ dateRange: { from: range.from, to: range.to } })
      setSelectedDateTemplate(undefined) // Clear template selection for custom range
    }
  }

  const toggleNetwork = (networkId: string) => {
    const isSelected = filters.networks.includes(networkId)
    if (isSelected) {
      updateFilters({ networks: filters.networks.filter(id => id !== networkId) })
    } else {
      updateFilters({ networks: [...filters.networks, networkId] })
    }
  }

  const toggleOffer = (offerId: string) => {
    const isSelected = filters.offers.includes(offerId)
    if (isSelected) {
      updateFilters({ offers: filters.offers.filter(id => id !== offerId) })
    } else {
      updateFilters({ offers: [...filters.offers, offerId] })
    }
  }

  const toggleSubId = (subId: string) => {
    const isSelected = filters.subIds.includes(subId)
    if (isSelected) {
      updateFilters({ subIds: filters.subIds.filter(id => id !== subId) })
    } else {
      updateFilters({ subIds: [...filters.subIds, subId] })
    }
  }

  const removeFilter = (type: 'networks' | 'offers' | 'subIds', value: string) => {
    updateFilters({
      [type]: filters[type].filter((item) => item !== value)
    })
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
    setSelectedDateTemplate(undefined)
  }

  const activeFiltersCount = 
    filters.networks.length + 
    filters.offers.length + 
    filters.subIds.length

  const currentDateRangeLabel = getDateRangeLabel(filters.dateRange.from, filters.dateRange.to)

  return (
    <div className="space-y-4">
      {/* Filter Chips Toolbar - Always Visible */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Chip */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs font-normal border-dashed"
              aria-label={`Date range: ${currentDateRangeLabel}. Click to change date range.`}
              aria-describedby={dateRangeId}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {currentDateRangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={filters.dateRange.from}
                selected={{
                  from: filters.dateRange.from,
                  to: filters.dateRange.to,
                }}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                aria-label="Select date range"
              />
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Network Filter Chips */}
        {filters.networks.map((networkId) => {
          const network = availableNetworks.find(n => n.id === networkId)
          return (
            <Badge 
              key={networkId} 
              variant="secondary" 
              className="h-8 text-xs gap-1 pr-1"
            >
              {network?.name || networkId}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0.5 hover:bg-transparent"
                onClick={() => removeFilter('networks', networkId)}
                aria-label={`Remove ${network?.name || networkId} filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )
        })}
        
        {/* Offer Filter Chips */}
        {filters.offers.map((offerId) => {
          const offer = [...availableOffers, ...networkOffers].find(o => o.id === offerId)
          return (
            <Badge 
              key={offerId} 
              variant="secondary" 
              className="h-8 text-xs gap-1 pr-1"
            >
              {offer?.name || offerId}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0.5 hover:bg-transparent"
                onClick={() => removeFilter('offers', offerId)}
                aria-label={`Remove ${offer?.name || offerId} filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )
        })}
        
        {/* Sub ID Filter Chips */}
        {filters.subIds.map((subId) => (
          <Badge 
            key={subId} 
            variant="secondary" 
            className="h-8 text-xs gap-1 pr-1"
          >
            {subId}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0.5 hover:bg-transparent"
              onClick={() => removeFilter('subIds', subId)}
              aria-label={`Remove ${subId} filter`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        
        {/* Edit Filters Button */}
        <Sheet open={isEditMode} onOpenChange={setIsEditMode}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs font-normal"
              aria-expanded={isEditMode}
              aria-controls="filter-editor"
            >
              <Settings2 className="h-3 w-3 mr-1" />
              Edit Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-4 text-xs px-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent id="filter-editor" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit Filters</SheetTitle>
              <SheetDescription>
                Configure your dashboard filters to focus on specific data.
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6 space-y-6">
              {/* Date Range Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" id={dateRangeId}>
                  Date Range
                </Label>
                <p className="text-xs text-muted-foreground" aria-describedby={dateRangeId}>
                  Choose a date range for your data analysis
                </p>
                
                {/* Quick Date Templates */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Quick Select
                  </Label>
                  <ToggleGroup 
                    type="single" 
                    value={selectedDateTemplate}
                    onValueChange={(value) => value && applyTemplate(value)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {dateTemplates.slice(0, 6).map((template) => (
                      <ToggleGroupItem
                        key={template.id}
                        value={template.id}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        aria-pressed={selectedDateTemplate === template.id}
                      >
                        {template.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  
                  {/* More Templates */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs h-8"
                      >
                        More Options
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1">
                      <div className="grid gap-1">
                        {dateTemplates.slice(6).map((template) => (
                          <Button
                            key={template.id}
                            variant="ghost"
                            size="sm"
                            className="justify-start text-xs h-8 font-normal"
                            onClick={() => applyTemplate(template.id)}
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
                  <Label className="text-xs font-medium text-muted-foreground">
                    Custom Range
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal text-sm h-9"
                        disabled={isLoading}
                        aria-label="Select custom date range"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                          filters.dateRange.to ? (
                            `${format(filters.dateRange.from, "MMM d, y")} - ${format(filters.dateRange.to, "MMM d, y")}`
                          ) : (
                            format(filters.dateRange.from, "MMM d, y")
                          )
                        ) : (
                          "Pick a date range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={filters.dateRange.from}
                        selected={{
                          from: filters.dateRange.from,
                          to: filters.dateRange.to,
                        }}
                        onSelect={handleDateRangeSelect}
                        numberOfMonths={2}
                        aria-label="Select date range"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <Separator />

              {/* Networks Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" id={networkId}>
                  Networks
                </Label>
                <p className="text-xs text-muted-foreground" aria-describedby={networkId}>
                  Select the affiliate networks to include in your analysis
                </p>
                
                {availableNetworks.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md">
                    No networks available
                  </div>
                ) : (
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Search networks..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No networks found.</CommandEmpty>
                      <CommandGroup>
                        {availableNetworks.map((network) => (
                          <CommandItem
                            key={network.id}
                            onSelect={() => toggleNetwork(network.id)}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={filters.networks.includes(network.id)}
                              onChange={() => toggleNetwork(network.id)}
                              aria-label={`${filters.networks.includes(network.id) ? 'Unselect' : 'Select'} ${network.name}`}
                            />
                            <span className="flex-1">{network.name}</span>
                            {filters.networks.includes(network.id) && (
                              <Check className="h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
              
              <Separator />

              {/* Offers Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" id={offersId}>
                  Offers
                </Label>
                <p className="text-xs text-muted-foreground" aria-describedby={offersId}>
                  Select specific offers to analyze performance
                </p>
                
                {filters.networks.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md">
                    Select a network first to load offers
                  </div>
                ) : loadingOffers ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md">
                    Loading offers...
                  </div>
                ) : (
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Search offers..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No offers found.</CommandEmpty>
                      <CommandGroup>
                        {[...availableOffers, ...networkOffers].map((offer) => (
                          <CommandItem
                            key={offer.id}
                            onSelect={() => toggleOffer(offer.id)}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={filters.offers.includes(offer.id)}
                              onChange={() => toggleOffer(offer.id)}
                              aria-label={`${filters.offers.includes(offer.id) ? 'Unselect' : 'Select'} ${offer.name}`}
                            />
                            <span className="flex-1">{offer.name}</span>
                            {filters.offers.includes(offer.id) && (
                              <Check className="h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
              
              <Separator />

              {/* Sub IDs Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" id={subIdsId}>
                  Sub IDs
                </Label>
                <p className="text-xs text-muted-foreground" aria-describedby={subIdsId}>
                  Filter by specific sub IDs from your campaigns
                </p>
                
                {availableSubIds.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md">
                    No sub IDs found for the current date range
                  </div>
                ) : (
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Search sub IDs..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No sub IDs found.</CommandEmpty>
                      <CommandGroup>
                        {availableSubIds.map((subId) => (
                          <CommandItem
                            key={subId}
                            onSelect={() => toggleSubId(subId)}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={filters.subIds.includes(subId)}
                              onChange={() => toggleSubId(subId)}
                              aria-label={`${filters.subIds.includes(subId) ? 'Unselect' : 'Select'} ${subId}`}
                            />
                            <span className="flex-1">{subId}</span>
                            {filters.subIds.includes(subId) && (
                              <Check className="h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
              <Button onClick={() => setIsEditMode(false)}>
                Done
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Clear All Button */}
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-muted-foreground"
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  )
}
