'use client'

import React, { useState } from 'react'
import { CalendarIcon, Settings2, X, Check } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { getDateTemplates } from '@/lib/utils/date-templates'

export interface FilterState {
  dateRange: {
    from: Date
    to: Date
  }
  networks: string[]
  offers: string[]
  subIds: string[]
}

interface FilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableNetworks: Array<{ id: string; name: string }>
  availableOffers: Array<{ id: string; name: string }>
  availableSubIds: string[]
  isLoading?: boolean
  onApply: (nextFilters?: FilterState) => void
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableNetworks,
  availableOffers,
  availableSubIds,
  isLoading = false,
  onApply
}: FilterPanelProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [networkOffers, setNetworkOffers] = useState<Array<{ id: string; name: string }>>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [pendingDateRange, setPendingDateRange] = useState<DateRange>({
    from: filters.dateRange.from,
    to: filters.dateRange.to
  })
  
  const templates = getDateTemplates()

  const updateFilters = (updates: Partial<FilterState>): FilterState => {
    console.log('🔄 [FILTER-PANEL] Updating filters:', updates)
    console.log('🔄 [FILTER-PANEL] Current filters:', filters)
    const newFilters: FilterState = {
      ...filters,
      ...updates,
      dateRange: updates.dateRange
        ? { from: new Date(updates.dateRange.from), to: new Date(updates.dateRange.to) }
        : { from: new Date(filters.dateRange.from), to: new Date(filters.dateRange.to) },
      networks: updates.networks !== undefined ? [...updates.networks] : [...filters.networks],
      offers: updates.offers !== undefined ? [...updates.offers] : [...filters.offers],
      subIds: updates.subIds !== undefined ? [...updates.subIds] : [...filters.subIds]
    }
    console.log('🔄 [FILTER-PANEL] New filters:', newFilters)
    onFiltersChange(newFilters)
    return newFilters
  }

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

  React.useEffect(() => {
    if (filters.networks.length > 0) {
      fetchOffersForNetwork(filters.networks[0])
    } else {
      setNetworkOffers([])
    }
  }, [filters.networks])

  React.useEffect(() => {
    // Only reset pendingDateRange when popover opens (to sync with current filters)
    // Don't reset when popover closes to preserve user's selection during apply process
    if (isDatePopoverOpen) {
      setPendingDateRange({
        from: filters.dateRange.from,
        to: filters.dateRange.to
      })
    }
  }, [isDatePopoverOpen, filters.dateRange])

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      const dateRange = template.getValue()
      console.log('📅 [TEMPLATE] Applying date template:', template.label, dateRange)
      setPendingDateRange(dateRange)
      // Apply template date range immediately
      const updatedFilters = updateFilters({ dateRange: { from: dateRange.from!, to: dateRange.to! } })
      onApply(updatedFilters)
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setPendingDateRange({ from: range.from, to: range.to })
    }
  }

  const applyDateRange = () => {
    if (pendingDateRange?.from && pendingDateRange?.to) {
      console.log('🗓️ [CALENDAR] Applying date range:', pendingDateRange)
      const updatedFilters = updateFilters({ dateRange: { from: pendingDateRange.from, to: pendingDateRange.to } })
      setIsDatePopoverOpen(false)
      // Auto-apply the date change immediately
      onApply(updatedFilters)
    }
  }

  const toggleNetwork = (networkId: string) => {
    const isSelected = filters.networks.includes(networkId)
    if (isSelected) {
      updateFilters({ networks: [] })
    } else {
      updateFilters({ networks: [networkId] })
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
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
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
    <div
      className={`space-y-4${isLoading ? ' pointer-events-none opacity-50' : ''}`}
      aria-busy={isLoading}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Simple Date Range Picker */}
          <Popover
            open={isDatePopoverOpen}
            onOpenChange={(open) => {
              setIsDatePopoverOpen(open)
              if (open) {
                setPendingDateRange({
                  from: filters.dateRange.from,
                  to: filters.dateRange.to
                })
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                      {format(filters.dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-xl border-border/50 backdrop-blur-sm" align="start">
              <div className="p-3 border-b border-border/40">
                <div className="text-sm font-medium mb-3 text-foreground/90">Date Templates</div>
                <Select onValueChange={applyTemplate}>
                <SelectTrigger className="h-9 text-sm border-border/50 hover:border-border bg-background/50 backdrop-blur-sm">
                  <SelectValue placeholder="Choose a date range..." />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {/* Quick Access */}
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/40 mb-1">
                    Quick Access
                  </div>
                  {templates.filter(t => t.category === 'quick').map((template) => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      className="text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <div>
                          <div className="font-medium">{template.label}</div>
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  
                  {/* Business Periods */}
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-t border-border/40 my-1">
                    Business Periods
                  </div>
                  {templates.filter(t => t.category === 'business').map((template) => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      className="text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <div>
                          <div className="font-medium">{template.label}</div>
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  
                  {/* Comparison Periods */}
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-t border-border/40 my-1">
                    Comparison Periods
                  </div>
                  {templates.filter(t => t.category === 'comparison').map((template) => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      className="text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <div>
                          <div className="font-medium">{template.label}</div>
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Calendar
              mode="range"
              defaultMonth={pendingDateRange?.from}
              selected={pendingDateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              classNames={{
                // Base table structure with subtle improvements
                table: "w-full border-collapse space-y-1",
                
                // Sophisticated weekday headers
                weekdays: "flex w-full border-b border-border/40 mb-2 pb-2",
                weekday: "text-muted-foreground/80 text-xs font-medium w-full text-center p-2 tracking-wide",
                
                // Week rows with proper spacing
                week: "flex w-full mt-0.5",
                
                // Enhanced day cells with hover
                day: "text-center p-0 relative w-full h-full hover:bg-primary/15 hover:text-primary hover:border hover:border-primary/25 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
                
                // Pronounced range start styling
                range_start: "bg-primary/20 text-primary font-medium border border-primary/30 rounded-md hover:bg-primary/25 transition-colors duration-150",
                
                // Pronounced range end styling
                range_end: "bg-primary/20 text-primary font-medium border border-primary/30 rounded-md hover:bg-primary/25 transition-colors duration-150",
                
                // Ultra-subtle range middle
                range_middle: "bg-primary/5 text-foreground hover:bg-primary/8 transition-colors duration-150",
                
                // Minimal selected state
                selected: "bg-primary/10 text-foreground hover:bg-primary/15 transition-colors duration-150",
                
                // Subtle today indicator
                today: "text-primary font-medium hover:bg-primary/8 transition-colors duration-150",
                
                // Sophisticated disabled and outside states
                outside: "text-muted-foreground/40 opacity-50 hover:opacity-60 transition-opacity duration-200",
                disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:opacity-30"
              }}
            />
            <div className="flex justify-end gap-2 border-t border-border/40 px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDatePopoverOpen(false)
                  setPendingDateRange({
                    from: filters.dateRange.from,
                    to: filters.dateRange.to
                  })
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyDateRange}
                disabled={!pendingDateRange?.from || !pendingDateRange?.to}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
          </Popover>

          {/* Filter Chips */}
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
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )
        })}
        
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
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )
        })}
        
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
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Edit Filters Button */}
          <Sheet open={isEditMode} onOpenChange={setIsEditMode}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs font-normal"
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
            <SheetContent className="sm:max-w-md flex flex-col h-full">
            <SheetHeader className="shrink-0">
              <SheetTitle>Edit Filters</SheetTitle>
              <SheetDescription>
                Configure your dashboard filters to focus on specific data.
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {/* Networks */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Networks
                </Label>
                
                {availableNetworks.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md">
                    No networks available
                  </div>
                ) : (
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Search networks..." className="h-9" />
                    <CommandList className="max-h-32">
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

              {/* Offers */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Offers
                </Label>
                
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
                    <CommandList className="max-h-32">
                      <CommandEmpty>No offers found.</CommandEmpty>
                      <CommandGroup>
                        {(() => {
                          // Combine offers and ensure "All Offers" comes first
                          const allOffers = [...availableOffers, ...networkOffers]
                          const allOffersItem = allOffers.find(o => o.id === 'all')
                          const otherOffers = allOffers.filter(o => o.id !== 'all')
                          return allOffersItem ? [allOffersItem, ...otherOffers] : otherOffers
                        })().map((offer) => (
                          <CommandItem
                            key={offer.id}
                            onSelect={() => toggleOffer(offer.id)}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={filters.offers.includes(offer.id)}
                              onChange={() => toggleOffer(offer.id)}
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

              {/* Sub IDs */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Sub IDs
                </Label>
                
                {availableSubIds.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground border rounded-md">
                    No sub IDs found for the current date range
                  </div>
                ) : (
                  <Command className="border rounded-md">
                    <CommandInput placeholder="Search sub IDs..." className="h-9" />
                    <CommandList className="max-h-32">
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
            
            <div className="shrink-0 flex justify-between pt-4 border-t mt-auto">
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
              <Button onClick={() => setIsEditMode(false)}>
                Done
              </Button>
            </div>
          </SheetContent>
        </Sheet>


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
    </div>
  )
}
