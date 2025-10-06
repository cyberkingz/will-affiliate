'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Filter,
  X,
  Search,
  ChevronDown,
  Tag,
  Hash,
  Settings,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Eye,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  isLoading?: boolean
}

export const TableFilters = React.memo(function TableFilters({
  filters,
  onFiltersChange,
  availableOfferNames = [],
  availableSubIds = [],
  availableSubIds2 = [],
  isLoading = false
}: TableFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')

  // Debug: Log when dropdown data changes
  React.useEffect(() => {
    console.log('🔍 [TABLE-FILTERS] Available options updated:', {
      offerNames: availableOfferNames.length,
      subIds: availableSubIds.length,
      subIds2: availableSubIds2.length,
      isLoading
    })
  }, [availableOfferNames, availableSubIds, availableSubIds2, isLoading])

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
    setQuickSearch('')
  }

  const hasActiveFilters = filters.offerName || filters.subId || filters.subId2
  const activeFilterCount = [filters.offerName, filters.subId, filters.subId2].filter(Boolean).length

  // Filter data based on quick search
  const filteredOfferNames = availableOfferNames.filter(offer => 
    offer.toLowerCase().includes(quickSearch.toLowerCase())
  )
  const filteredSubIds = availableSubIds.filter(subId => 
    subId.toLowerCase().includes(quickSearch.toLowerCase())
  )
  const filteredSubIds2 = availableSubIds2.filter(subId => 
    subId.toLowerCase().includes(quickSearch.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-neutral-950 to-neutral-900 border-neutral-800/50 shadow-lg shadow-black/5 overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-0">
            {/* Enhanced Header with Filter Toggle */}
            <motion.div 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-900/80 to-neutral-800/60 border-b border-neutral-800/50"
              whileHover={{ backgroundColor: 'rgba(23, 23, 23, 0.9)' }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-neutral-300 hover:text-blue-300 hover:bg-blue-500/10 transition-all duration-200 group"
                  >
                    <motion.div
                      animate={{ scale: isCollapsed ? 1.1 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Filter className="w-4 h-4 text-blue-500 mr-2 group-hover:text-blue-400" />
                    </motion.div>
                    <span className="font-medium">Advanced Filters</span>
                    <motion.div
                      animate={{ rotate: isCollapsed ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </motion.div>
                  </Button>
                </motion.div>
                
                <AnimatePresence>
                  {activeFilterCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg transition-shadow">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {activeFilterCount} active
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3">
                {/* Enhanced Quick Search */}
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4 transition-colors" />
                  <Input
                    placeholder="Quick search..."
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    className="pl-10 w-52 bg-gradient-to-r from-neutral-900 to-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                  {quickSearch && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setQuickSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>

                <AnimatePresence>
                  {hasActiveFilters && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 10 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-400/30 transition-all duration-200"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Reset All
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Enhanced Filter Controls */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div 
                  className="p-4 space-y-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Enhanced Filter by Offer Name */}
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                    >
                      <label className="text-sm text-neutral-400 flex items-center gap-2 font-medium">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Tag className="w-4 h-4 text-blue-400" />
                        </motion.div>
                        Offer Name
                      </label>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Select value={filters.offerName || 'all'} onValueChange={(value) => handleFilterChange('offerName', value)} disabled={isLoading}>
                          <SelectTrigger className="bg-gradient-to-r from-neutral-800 to-neutral-700 border-neutral-600 text-neutral-200 hover:border-blue-500/50 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                <span>Loading offers...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="All Offers" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700 backdrop-blur-sm">
                            <SelectItem value="all" className="text-neutral-200 hover:bg-blue-500/10 focus:bg-blue-500/20">All Offers</SelectItem>
                            {filteredOfferNames.map((offer) => (
                              <SelectItem key={offer} value={offer} className="text-neutral-200 hover:bg-blue-500/10 focus:bg-blue-500/20">
                                <div className="flex items-center gap-2 truncate">
                                  <TrendingUp className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                  <span className="truncate">{offer}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                      <AnimatePresence>
                        {filters.offerName && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20 transition-colors cursor-pointer group">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {filters.offerName.length > 20 ? `${filters.offerName.slice(0, 20)}...` : filters.offerName}
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleFilterChange('offerName', 'all')}
                                className="ml-2 text-blue-300 hover:text-blue-200 group-hover:bg-blue-400/20 rounded-full p-0.5 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </motion.button>
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Enhanced Filter by Sub ID */}
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.15 }}
                    >
                      <label className="text-sm text-neutral-400 flex items-center gap-2 font-medium">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Hash className="w-4 h-4 text-green-400" />
                        </motion.div>
                        Sub ID
                      </label>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Select value={filters.subId ? (filters.subId === '' ? 'empty' : filters.subId) : 'all'} onValueChange={(value) => handleFilterChange('subId', value)} disabled={isLoading}>
                          <SelectTrigger className="bg-gradient-to-r from-neutral-800 to-neutral-700 border-neutral-600 text-neutral-200 hover:border-green-500/50 transition-all duration-200 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                                <span>Loading Sub IDs...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="All Sub IDs" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700 backdrop-blur-sm">
                            <SelectItem value="all" className="text-neutral-200 hover:bg-green-500/10 focus:bg-green-500/20">All Sub IDs</SelectItem>
                            {filteredSubIds.map((subId, index) => (
                              <SelectItem key={index} value={subId || 'empty'} className="text-neutral-200 hover:bg-green-500/10 focus:bg-green-500/20">
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3 h-3 text-green-400 flex-shrink-0" />
                                  <span className="font-mono text-sm">{subId || 'Empty'}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                      <AnimatePresence>
                        {filters.subId && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30 hover:bg-green-500/20 transition-colors cursor-pointer group">
                              <Hash className="w-3 h-3 mr-1" />
                              <span className="font-mono">{filters.subId || 'Empty'}</span>
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleFilterChange('subId', 'all')}
                                className="ml-2 text-green-300 hover:text-green-200 group-hover:bg-green-400/20 rounded-full p-0.5 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </motion.button>
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Enhanced Filter by Sub ID 2 */}
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.2 }}
                    >
                      <label className="text-sm text-neutral-400 flex items-center gap-2 font-medium">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Settings className="w-4 h-4 text-purple-400" />
                        </motion.div>
                        Sub ID 2
                      </label>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Select value={filters.subId2 ? (filters.subId2 === '' ? 'empty' : filters.subId2) : 'all'} onValueChange={(value) => handleFilterChange('subId2', value)} disabled={isLoading}>
                          <SelectTrigger className="bg-gradient-to-r from-neutral-800 to-neutral-700 border-neutral-600 text-neutral-200 hover:border-purple-500/50 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                <span>Loading Sub ID 2s...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="All Sub ID 2s" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700 backdrop-blur-sm">
                            <SelectItem value="all" className="text-neutral-200 hover:bg-purple-500/10 focus:bg-purple-500/20">All Sub ID 2s</SelectItem>
                            {filteredSubIds2.map((subId2, index) => (
                              <SelectItem key={index} value={subId2 || 'empty'} className="text-neutral-200 hover:bg-purple-500/10 focus:bg-purple-500/20">
                                <div className="flex items-center gap-2">
                                  <Settings className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                  <span className="font-mono text-sm">{subId2 || 'Empty'}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                      <AnimatePresence>
                        {filters.subId2 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer group">
                              <Settings className="w-3 h-3 mr-1" />
                              <span className="font-mono">{filters.subId2 || 'Empty'}</span>
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleFilterChange('subId2', 'all')}
                                className="ml-2 text-purple-300 hover:text-purple-200 group-hover:bg-purple-400/20 rounded-full p-0.5 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </motion.button>
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  {/* Enhanced Active Filters Summary */}
                  <AnimatePresence>
                    {hasActiveFilters && (
                      <motion.div 
                        className="pt-4 border-t border-neutral-800/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm text-neutral-400 font-medium">Active filters:</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <AnimatePresence>
                              {filters.offerName && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20 transition-colors">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Offer: {filters.offerName.length > 15 ? `${filters.offerName.slice(0, 15)}...` : filters.offerName}
                                  </Badge>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <AnimatePresence>
                              {filters.subId && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2, delay: 0.05 }}
                                >
                                  <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30 hover:bg-green-500/20 transition-colors">
                                    <Hash className="w-3 h-3 mr-1" />
                                    Sub ID: <span className="font-mono">{filters.subId}</span>
                                  </Badge>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <AnimatePresence>
                              {filters.subId2 && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 transition-colors">
                                    <Settings className="w-3 h-3 mr-1" />
                                    Campaign: <span className="font-mono">{filters.subId2}</span>
                                  </Badge>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (skip re-render), false if different (re-render)

  // Always re-render if loading state changes
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false
  }

  // Check if filter state changed
  if (
    prevProps.filters.offerName !== nextProps.filters.offerName ||
    prevProps.filters.subId !== nextProps.filters.subId ||
    prevProps.filters.subId2 !== nextProps.filters.subId2
  ) {
    return false
  }

  // Check if available options arrays changed (length or content)
  if (
    prevProps.availableOfferNames?.length !== nextProps.availableOfferNames?.length ||
    prevProps.availableSubIds?.length !== nextProps.availableSubIds?.length ||
    prevProps.availableSubIds2?.length !== nextProps.availableSubIds2?.length
  ) {
    return false
  }

  // All props are equal - skip re-render
  return true
})
