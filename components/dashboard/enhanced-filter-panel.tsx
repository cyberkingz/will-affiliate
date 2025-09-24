'use client'

import React, { useState, useId, useCallback } from 'react'
import { Settings2, X, Check, ChevronDown, Filter, Sparkles, Network, Target, Hash, Zap, CalendarIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
import { ElegantDateRangePicker } from '@/components/ui/elegant-date-range-picker'
import { cn } from '@/lib/utils'

export interface FilterState {
  dateRange: {
    from: Date
    to: Date
  }
  networks: string[]
  offers: string[]
  subIds: string[]
}

interface EnhancedFilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableNetworks: Array<{ id: string; name: string; status?: 'active' | 'inactive' }>
  availableOffers: Array<{ id: string; name: string; networkId?: string; status?: 'active' | 'paused' }>
  availableSubIds: string[]
  isLoading?: boolean
  className?: string
  compactMode?: boolean
}

interface FilterChipProps {
  label: string
  onRemove: () => void
  variant?: 'default' | 'network' | 'offer' | 'subid'
  className?: string
}

function FilterChip({ label, onRemove, variant = 'default', className }: FilterChipProps) {
  const [isHovered, setIsHovered] = useState(false)

  const variantStyles = {
    default: {
      base: 'bg-secondary text-secondary-foreground border-secondary',
      icon: Network,
      color: 'gray'
    },
    network: {
      base: 'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 border-blue-200/50 dark:from-blue-950 dark:to-blue-900/50 dark:text-blue-300 dark:border-blue-800/50',
      hover: 'hover:from-blue-100 hover:to-blue-200/50 dark:hover:from-blue-900 dark:hover:to-blue-800/50',
      icon: Network,
      color: 'blue'
    },
    offer: {
      base: 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/50 dark:from-emerald-950 dark:to-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800/50',
      hover: 'hover:from-emerald-100 hover:to-emerald-200/50 dark:hover:from-emerald-900 dark:hover:to-emerald-800/50',
      icon: Target,
      color: 'emerald'
    },
    subid: {
      base: 'bg-gradient-to-r from-violet-50 to-violet-100/50 text-violet-700 border-violet-200/50 dark:from-violet-950 dark:to-violet-900/50 dark:text-violet-300 dark:border-violet-800/50',
      hover: 'hover:from-violet-100 hover:to-violet-200/50 dark:hover:from-violet-900 dark:hover:to-violet-800/50',
      icon: Hash,
      color: 'violet'
    }
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Badge 
        variant="outline" 
        className={cn(
          'h-9 text-xs gap-2 pr-1 font-medium transition-all duration-200 group cursor-default',
          'border-2 shadow-sm backdrop-blur-sm',
          style.base,
          style.hover,
          'hover:shadow-md hover:shadow-black/5',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          animate={{ rotate: isHovered ? 5 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-1.5"
        >
          <Icon className="h-3 w-3" />
          <span className="font-semibold">{label}</span>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 hover:bg-foreground/10 rounded-full transition-all duration-200",
              "group-hover:bg-destructive/10 hover:!bg-destructive/20"
            )}
            onClick={onRemove}
            aria-label={`Remove ${label} filter`}
          >
            <X className="h-3 w-3 group-hover:text-destructive transition-colors" />
          </Button>
        </motion.div>
      </Badge>
    </motion.div>
  )
}

export function EnhancedFilterPanel({
  filters,
  onFiltersChange,
  availableNetworks,
  availableOffers,
  availableSubIds,
  isLoading = false,
  className,
  compactMode = false
}: EnhancedFilterPanelProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [networkOffers, setNetworkOffers] = useState<Array<{ id: string; name: string }>>([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  
  // Generate stable IDs for accessibility
  const networkId = useId()
  const offersId = useId()
  const subIdsId = useId()

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }, [filters, onFiltersChange])

  const fetchOffersForNetwork = useCallback(async (networkId: string) => {
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
  }, [])

  // Fetch offers when networks change
  React.useEffect(() => {
    if (filters.networks.length > 0) {
      fetchOffersForNetwork(filters.networks[0])
    } else {
      setNetworkOffers([])
    }
  }, [filters.networks, fetchOffersForNetwork])

  const toggleNetwork = useCallback((networkId: string) => {
    const isSelected = filters.networks.includes(networkId)
    if (isSelected) {
      updateFilters({ networks: filters.networks.filter(id => id !== networkId) })
    } else {
      updateFilters({ networks: [...filters.networks, networkId] })
    }
  }, [filters.networks, updateFilters])

  const toggleOffer = useCallback((offerId: string) => {
    const isSelected = filters.offers.includes(offerId)
    if (isSelected) {
      updateFilters({ offers: filters.offers.filter(id => id !== offerId) })
    } else {
      updateFilters({ offers: [...filters.offers, offerId] })
    }
  }, [filters.offers, updateFilters])

  const toggleSubId = useCallback((subId: string) => {
    const isSelected = filters.subIds.includes(subId)
    if (isSelected) {
      updateFilters({ subIds: filters.subIds.filter(id => id !== subId) })
    } else {
      updateFilters({ subIds: [...filters.subIds, subId] })
    }
  }, [filters.subIds, updateFilters])

  const removeFilter = useCallback((type: 'networks' | 'offers' | 'subIds', value: string) => {
    updateFilters({
      [type]: filters[type].filter((item) => item !== value)
    })
  }, [filters, updateFilters])

  const clearFilters = useCallback(() => {
    onFiltersChange({
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      },
      networks: [],
      offers: [],
      subIds: []
    })
  }, [onFiltersChange])

  const activeFiltersCount = 
    filters.networks.length + 
    filters.offers.length + 
    filters.subIds.length

  return (
    <motion.div 
      className={cn("space-y-6", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Enhanced Filter Toolbar with Premium Design */}
      <div className="space-y-4">
        {/* Primary Filter Row */}
        <motion.div 
          className="flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Premium Date Range Picker */}
          <ElegantDateRangePicker
            dateRange={filters.dateRange}
            onDateRangeChange={(range) => updateFilters({ dateRange: range })}
            size={compactMode ? 'sm' : 'md'}
            variant="minimal"
            compactMode={compactMode}
            showAnimation={true}
            highlightToday={true}
          />
          
          {/* Enhanced Edit Filters Button */}
          <Sheet open={isEditMode} onOpenChange={setIsEditMode}>
            <SheetTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline" 
                  size={compactMode ? "sm" : "default"}
                  className={cn(
                    "font-medium transition-all duration-200 hover:bg-accent/50 group relative overflow-hidden",
                    compactMode ? "h-9 text-xs" : "h-11",
                    activeFiltersCount > 0 && "border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-md"
                  )}
                  aria-expanded={isEditMode}
                  aria-controls="enhanced-filter-editor"
                >
                  {/* Background gradient overlay */}
                  {activeFiltersCount > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                  
                  <motion.div
                    animate={{ rotate: isEditMode ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="relative z-10"
                  >
                    <Filter className={cn(
                      "mr-2 text-muted-foreground group-hover:text-primary transition-colors",
                      compactMode ? "h-3 w-3" : "h-4 w-4",
                      activeFiltersCount > 0 && "text-primary"
                    )} />
                  </motion.div>
                  
                  <span className="relative z-10">Advanced Filters</span>
                  
                  <AnimatePresence>
                    {activeFiltersCount > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="relative z-10"
                      >
                        <Badge 
                          variant="secondary" 
                          className="ml-2 h-6 text-xs px-2 bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30 font-bold"
                        >
                          {activeFiltersCount}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </SheetTrigger>
        
          <SheetContent id="enhanced-filter-editor" className="sm:max-w-lg overflow-hidden">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              <SheetHeader className="space-y-4 pb-6">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <SheetTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">Advanced Filters</div>
                      <div className="text-sm text-muted-foreground font-normal">Configure campaign analysis</div>
                    </div>
                  </SheetTitle>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <SheetDescription className="text-muted-foreground">
                    Fine-tune your dashboard with advanced filtering options to focus on specific campaign data and performance metrics.
                  </SheetDescription>
                </motion.div>
              </SheetHeader>
            
            <div className="py-6 space-y-8 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {/* Enhanced Date Range Section */}
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/50 dark:border-blue-800/50">
                    <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Date Range</Label>
                    <p className="text-xs text-muted-foreground">Time period for analysis</p>
                  </div>
                </div>
                
                <ElegantDateRangePicker
                  dateRange={filters.dateRange}
                  onDateRangeChange={(range) => updateFilters({ dateRange: range })}
                  size="md"
                  variant="minimal"
                  className="w-full"
                  showAnimation={true}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
              </motion.div>

              {/* Enhanced Networks Section */}
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/50 dark:border-blue-800/50">
                    <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold" id={networkId}>Affiliate Networks</Label>
                    <p className="text-xs text-muted-foreground" aria-describedby={networkId}>Select networks to include</p>
                  </div>
                </div>
                
                {availableNetworks.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                    No networks available
                  </div>
                ) : (
                  <Command className="border rounded-lg">
                    <CommandInput placeholder="Search networks..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No networks found.</CommandEmpty>
                      <CommandGroup>
                        {availableNetworks.map((network) => (
                          <CommandItem
                            key={network.id}
                            onSelect={() => toggleNetwork(network.id)}
                            className="flex items-center space-x-3 cursor-pointer py-2"
                          >
                            <Checkbox
                              checked={filters.networks.includes(network.id)}
                              onChange={() => toggleNetwork(network.id)}
                              aria-label={`${filters.networks.includes(network.id) ? 'Unselect' : 'Select'} ${network.name}`}
                            />
                            <span className="flex-1 font-medium">{network.name}</span>
                            {network.status && (
                              <Badge variant={network.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {network.status}
                              </Badge>
                            )}
                            {filters.networks.includes(network.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </motion.div>
              
              <Separator />

              {/* Enhanced Offers Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" id={offersId}>
                  Campaign Offers
                </Label>
                <p className="text-xs text-muted-foreground" aria-describedby={offersId}>
                  Choose specific offers to analyze performance data
                </p>
                
                {filters.networks.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                    <div className="text-center">
                      <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div className="font-medium">Select a network first</div>
                      <div className="text-xs mt-1">Choose a network to load available offers</div>
                    </div>
                  </div>
                ) : loadingOffers ? (
                  <div className="p-4 text-sm text-muted-foreground border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary border-r-transparent rounded-full animate-spin" />
                      Loading offers...
                    </div>
                  </div>
                ) : (
                  <Command className="border rounded-lg">
                    <CommandInput placeholder="Search offers..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No offers found.</CommandEmpty>
                      <CommandGroup>
                        {[...availableOffers, ...networkOffers].map((offer) => (
                          <CommandItem
                            key={offer.id}
                            onSelect={() => toggleOffer(offer.id)}
                            className="flex items-center space-x-3 cursor-pointer py-2"
                          >
                            <Checkbox
                              checked={filters.offers.includes(offer.id)}
                              onChange={() => toggleOffer(offer.id)}
                              aria-label={`${filters.offers.includes(offer.id) ? 'Unselect' : 'Select'} ${offer.name}`}
                            />
                            <span className="flex-1 font-medium">{offer.name}</span>
                            {filters.offers.includes(offer.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
              
              <Separator />

              {/* Enhanced Sub IDs Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" id={subIdsId}>
                  Sub IDs
                </Label>
                <p className="text-xs text-muted-foreground" aria-describedby={subIdsId}>
                  Filter by specific tracking sub IDs from your campaigns
                </p>
                
                {availableSubIds.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                    No sub IDs found for the current filters
                  </div>
                ) : (
                  <Command className="border rounded-lg">
                    <CommandInput placeholder="Search sub IDs..." className="h-9" />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No sub IDs found.</CommandEmpty>
                      <CommandGroup>
                        {availableSubIds.map((subId) => (
                          <CommandItem
                            key={subId}
                            onSelect={() => toggleSubId(subId)}
                            className="flex items-center space-x-3 cursor-pointer py-2"
                          >
                            <Checkbox
                              checked={filters.subIds.includes(subId)}
                              onChange={() => toggleSubId(subId)}
                              aria-label={`${filters.subIds.includes(subId) ? 'Unselect' : 'Select'} ${subId}`}
                            />
                            <span className="flex-1 font-mono text-sm">{subId}</span>
                            {filters.subIds.includes(subId) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
            </div>

            {/* Enhanced Footer Actions */}
            <motion.div 
              className="flex justify-between pt-6 border-t border-border/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  onClick={clearFilters} 
                  disabled={activeFiltersCount === 0}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setIsEditMode(false)}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
          </SheetContent>
        </Sheet>

        </motion.div>

        {/* Filter Chips with Enhanced Styling */}
        {(filters.networks.length > 0 || filters.offers.length > 0 || filters.subIds.length > 0) && (
          <motion.div 
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <AnimatePresence mode="popLayout">
              {filters.networks.map((networkId) => {
                const network = availableNetworks.find(n => n.id === networkId)
                return (
                  <FilterChip
                    key={`network-${networkId}`}
                    label={network?.name || networkId}
                    variant="network"
                    onRemove={() => removeFilter('networks', networkId)}
                  />
                )
              })}

              {filters.offers.map((offerId) => {
                const offer = [...availableOffers, ...networkOffers].find(o => o.id === offerId)
                return (
                  <FilterChip
                    key={`offer-${offerId}`}
                    label={offer?.name || offerId}
                    variant="offer"
                    onRemove={() => removeFilter('offers', offerId)}
                  />
                )
              })}

              {filters.subIds.map((subId) => (
                <FilterChip
                  key={`subid-${subId}`}
                  label={subId}
                  variant="subid"
                  onRemove={() => removeFilter('subIds', subId)}
                />
              ))}
            </AnimatePresence>

            {activeFiltersCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="ghost" 
                  size={compactMode ? 'sm' : 'default'}
                  onClick={clearFilters}
                  className={cn(
                    'text-muted-foreground hover:text-destructive transition-all duration-200',
                    'hover:bg-destructive/10 hover:shadow-sm',
                    compactMode ? 'h-9 text-xs' : 'h-11'
                  )}
                >
                  <X className={cn('mr-1', compactMode ? 'h-3 w-3' : 'h-4 w-4')} />
                  Clear All
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export { EnhancedFilterPanel }
