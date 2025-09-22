'use client'

import React, { useState, useId } from 'react'
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
  
  const templates = getDateTemplates()
  const dateRangeId = useId()
  const networkId = useId()
  const offersId = useId()
  const subIdsId = useId()

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
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

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      const dateRange = template.getValue()
      updateFilters({ dateRange })
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      updateFilters({ dateRange: { from: range.from, to: range.to } })
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Simple Date Range Picker */}
        <Popover>
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
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <div className="text-sm font-medium mb-2">Quick Select</div>
              <div className="grid grid-cols-2 gap-2">
                {templates.filter(t => t.category === 'quick').slice(0, 4).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start"
                    onClick={() => applyTemplate(template.id)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
            <Calendar
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              classNames={{
                weekdays: "flex w-full",
                weekday: "text-muted-foreground text-xs font-medium w-full text-center p-2",
                week: "flex w-full mt-1",
                day: "text-center p-0 relative w-full h-full hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                table: "w-full border-collapse space-y-1",
                range_start: "bg-primary text-primary-foreground rounded-l-md hover:bg-primary/90",
                range_end: "bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90",
                range_middle: "bg-accent/50 text-accent-foreground rounded-none hover:bg-accent/70",
                selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                today: "bg-accent text-accent-foreground font-semibold",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-30 cursor-not-allowed"
              }}
            />
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
                        {[...availableOffers, ...networkOffers].map((offer) => (
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
  )
}