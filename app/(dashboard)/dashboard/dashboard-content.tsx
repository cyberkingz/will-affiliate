'use client'

import { useState, useEffect, useCallback } from 'react'
import { FilterPanel, FilterState } from '@/components/dashboard/filter-panel'
import { KPICards, KPIData } from '@/components/dashboard/kpi-cards'
import { TrendsChart, TrendData } from '@/components/dashboard/trends-chart'
import { ClicksTable, ClickData } from '@/components/dashboard/clicks-table'
import { ConversionsTable, ConversionData } from '@/components/dashboard/conversions-table'
import { TableFilters, TableFiltersState } from '@/components/dashboard/table-filters'
import { NetworkSelector } from '@/components/dashboard/network-selector'
import { useDashboardUser } from '@/components/dashboard/dashboard-user-context'

type FiltersApiResponse = {
  networks: Array<{ id: string; name: string; status?: string }>
  campaigns: Array<{ id: string; name: string }>
  subIds: string[]
  subIds1?: string[]
  subIds2?: string[]
  offerNames?: string[]
}

const createDefaultKpiData = (): KPIData => ({
  revenue: { value: 0, change: 0, period: '30d' },
  clicks: { value: 0, change: 0 },
  conversions: { value: 0, change: 0 },
  cvr: { value: 0, change: 0 },
  epc: { value: 0, change: 0 },
  roas: { value: 0, change: 0 },
  peakHour: { value: '--', clicks: 0 }
})

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateForAPI = (date: Date): string => {
  // Use local timezone to get the actual date components
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  // For API calls, we want to send the date without timezone conversion
  // Just send as YYYY-MM-DD format and let the API handle it
  return `${year}-${month}-${day}`
}

const getDefaultFilters = (): FilterState => {
  const now = new Date()
  // Use last 7 days as default (smaller range for better performance on initial load)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(now.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  
  return {
    dateRange: {
      from: sevenDaysAgo, // Last 7 days instead of full month
      to: now
    },
    networks: [],
    offers: [], // Empty means ALL offers
    subIds: [] // Empty means ALL sub IDs
  }
}

const cloneFilterState = (state: FilterState): FilterState => ({
  dateRange: {
    from: new Date(state.dateRange.from),
    to: new Date(state.dateRange.to)
  },
  networks: [...state.networks],
  offers: [...state.offers],
  subIds: [...state.subIds]
})



export function DashboardContent() {
  useDashboardUser()
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters)
  const [draftFilters, setDraftFilters] = useState<FilterState>(getDefaultFilters)

  const [kpiData, setKpiData] = useState<KPIData>(createDefaultKpiData)

  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [clicksData, setClicksData] = useState<ClickData[]>([])
  const [conversionsData, setConversionsData] = useState<ConversionData[]>([])
  const [tableFilters, setTableFilters] = useState<TableFiltersState>({
    offerName: '',
    subId: '',
    subId2: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [isNetworkLoading, setIsNetworkLoading] = useState(true)
  const [networkError, setNetworkError] = useState<string | null>(null)
  // Available filter options
  const [availableNetworks, setAvailableNetworks] = useState<Array<{ id: string; name: string }>>([])
  const [availableOffers, setAvailableOffers] = useState<Array<{ id: string; name: string }>>([])
  const [availableSubIds, setAvailableSubIds] = useState<string[]>([])
  const [availableOfferNames, setAvailableOfferNames] = useState<string[]>([])
  const [availableTableSubIds, setAvailableTableSubIds] = useState<string[]>([])
  const [availableTableSubIds2, setAvailableTableSubIds2] = useState<string[]>([])
  const selectedNetworks = filters.networks
  const dateRangeKey = `${filters.dateRange.from.getTime()}-${filters.dateRange.to.getTime()}`
  const networkKey = filters.networks.join('|')

  useEffect(() => {
    setDraftFilters(cloneFilterState(filters))
  }, [filters])


  const handleApplyFilters = useCallback((nextFilters?: FilterState) => {
    const filtersToApply = nextFilters ?? draftFilters
    console.log('📝 [DASHBOARD] Applying filters from draft to main')
    console.log('📝 [DASHBOARD] Current main filters:', filters)
    console.log('📝 [DASHBOARD] Filters to apply:', filtersToApply)
    const clonedFilters = cloneFilterState(filtersToApply)
    console.log('📝 [DASHBOARD] Cloned filters:', clonedFilters)
    setFilters(clonedFilters)
  }, [draftFilters, filters])

  useEffect(() => {
    if (availableNetworks.length === 0) {
      if (selectedNetworks.length > 0) {
        setFilters(prev => ({ ...prev, networks: [] }))
      }
      return
    }

    const availableIds = new Set(availableNetworks.map(network => network.id))
    const validSelections = selectedNetworks.filter(id => availableIds.has(id))

    if (validSelections.length !== selectedNetworks.length) {
      setFilters(prev => ({ ...prev, networks: validSelections }))
      return
    }

    if (validSelections.length > 1) {
      setFilters(prev => ({ ...prev, networks: [validSelections[0]] }))
    }

    // Don't auto-select networks - let user choose
    // if (validSelections.length === 0) {
    //   setFilters(prev => ({ ...prev, networks: [availableNetworks[0].id] }))
    // }
  }, [availableNetworks, selectedNetworks, setFilters])

  // Separate function to fetch only network options (no API calls to Affluent)
  const fetchNetworkOptions = useCallback(async () => {
    setIsNetworkLoading(true)
    setNetworkError(null)
    
    try {
      // Only fetch network connections from database - no external API calls
      const response = await fetch('/api/networks/list')
      
      if (response.ok) {
        const data = await response.json()
        setAvailableNetworks(data.networks || [])
        console.log('✅ [FRONTEND] Networks loaded successfully:', data.networks?.length || 0)
      } else {
        console.error('❌ [FRONTEND] Networks API failed:', response.status)
        setNetworkError(`Failed to load networks (${response.status})`)
        setAvailableNetworks([])
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error fetching networks:', error)
      setNetworkError('Unable to connect to the server')
      setAvailableNetworks([])
    } finally {
      setIsNetworkLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    // Don't fetch data if no networks are selected
    if (!filters.networks || filters.networks.length === 0) {
      console.log('🚫 [FRONTEND] Skipping data fetch - no networks selected')
      return
    }

    setIsLoading(true)
    setIsTableLoading(true)

    const startTime = performance.now()
    console.log('⏱️ [PERFORMANCE] Starting dashboard data fetch...')

    try {
      const formattedStartDate = formatDateForAPI(filters.dateRange.from)
      const formattedEndDate = formatDateForAPI(filters.dateRange.to)

      // Prepare request bodies
      const requestBody = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        networks: filters.networks,
        offers: filters.offers,
        subIds: filters.subIds
      }

      const tableRequestBody = {
        ...requestBody,
        tableFilters: tableFilters,
        page: 1,
        limit: 50
      }

      console.log('🚀 [PERFORMANCE] Launching parallel API requests...')

      // CRITICAL OPTIMIZATION: Load graph data FIRST (fast), then load tables (slow)
      // This allows users to see KPIs immediately while tables load in background

      // Phase 1: Load critical data for KPI graph (fast - ~7s)
      const [summaryResponse] = await Promise.allSettled([
        fetch('/api/campaigns/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      ])

      // Process summary response - THIS SHOWS THE GRAPH IMMEDIATELY
      if (summaryResponse.status === 'fulfilled' && summaryResponse.value.ok) {
        const summaryData = await summaryResponse.value.json()
        setKpiData(summaryData.kpis)
        setTrendData(summaryData.trends)
        console.log('📊 [FRONTEND] Summary data loaded - GRAPH NOW VISIBLE')

        // Stop main loading indicator - graph is ready!
        setIsLoading(false)
      } else {
        console.error('❌ [DASHBOARD] Summary API failed:',
          summaryResponse.status === 'fulfilled' ? summaryResponse.value.status : summaryResponse.reason)
        setIsLoading(false)
      }

      // Phase 2: Load table data in background (slow - 45-60s)
      console.log('🔄 [PERFORMANCE] Loading table data in background...')
      const [clicksResponse, conversionsResponse, liveFiltersResponse] =
        await Promise.allSettled([
          fetch('/api/campaigns/real-clicks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tableRequestBody)
          }),
          fetch('/api/campaigns/real-conversions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tableRequestBody)
          }),
          fetch('/api/campaigns/live-filters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: formattedStartDate,
              endDate: formattedEndDate,
              networks: filters.networks
            })
          })
        ])

      console.log('✅ [PERFORMANCE] Background table data loaded')

      // Process clicks response
      if (clicksResponse.status === 'fulfilled' && clicksResponse.value.ok) {
        const clicksData = await clicksResponse.value.json()
        setClicksData(clicksData.clicks || [])
        console.log('📊 [FRONTEND] Clicks data loaded:', clicksData.clicks?.length || 0)
      } else {
        console.error('❌ [DASHBOARD] Clicks API failed:',
          clicksResponse.status === 'fulfilled' ? clicksResponse.value.status : clicksResponse.reason)
        setClicksData([])
      }

      // Process conversions response
      if (conversionsResponse.status === 'fulfilled' && conversionsResponse.value.ok) {
        const conversionsData = await conversionsResponse.value.json()
        setConversionsData(conversionsData.conversions || [])
        console.log('📊 [FRONTEND] Conversions data loaded:', conversionsData.conversions?.length || 0)
      } else {
        console.error('❌ [DASHBOARD] Conversions API failed:',
          conversionsResponse.status === 'fulfilled' ? conversionsResponse.value.status : conversionsResponse.reason)
        setConversionsData([])
      }

      // Process live filters response
      if (liveFiltersResponse.status === 'fulfilled' && liveFiltersResponse.value.ok) {
        const liveFiltersData = await liveFiltersResponse.value.json() as FiltersApiResponse
        console.log('📋 [FRONTEND] Live filters data received')

        // Set all filter options from live data
        setAvailableNetworks(liveFiltersData.networks || [])
        setAvailableOffers(liveFiltersData.campaigns || [])
        setAvailableSubIds(liveFiltersData.subIds || [])

        // Set table filter options
        const offerNames = liveFiltersData.offerNames ||
          liveFiltersData.campaigns?.map((c: { name: string }) => c.name).filter(Boolean) as string[] || []
        setAvailableOfferNames([...new Set(offerNames)])
        setAvailableTableSubIds(liveFiltersData.subIds1 || liveFiltersData.subIds || [])
        setAvailableTableSubIds2(liveFiltersData.subIds2 || [])

        console.log('🎯 [FRONTEND] Filter options loaded:', {
          offers: liveFiltersData.campaigns?.length || 0,
          subIds: liveFiltersData.subIds?.length || 0,
          subIds2: liveFiltersData.subIds2?.length || 0
        })
      } else {
        console.error('❌ [FRONTEND] Live filters API failed:',
          liveFiltersResponse.status === 'fulfilled' ? liveFiltersResponse.value.status : liveFiltersResponse.reason)

        // Set empty filter options on failure
        setAvailableOffers([])
        setAvailableSubIds([])
        setAvailableOfferNames([])
        setAvailableTableSubIds([])
        setAvailableTableSubIds2([])
      }

    } catch (error) {
      console.error('❌ [DASHBOARD] Error fetching dashboard data:', error)
      setIsLoading(false)
      setIsTableLoading(false)
    } finally {
      // Table loading done
      setIsTableLoading(false)

      const loadTime = performance.now() - startTime
      console.log(`⏱️ [PERFORMANCE] Dashboard loaded in ${(loadTime / 1000).toFixed(2)}s`)

      // Send performance metric to analytics if available
      if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as { gtag?: unknown }).gtag === 'function') {
        const gtag = (window as { gtag: (...args: unknown[]) => void }).gtag
        gtag('event', 'dashboard_load', {
          load_time_ms: Math.round(loadTime),
          network_count: filters.networks.length,
          date_range_days: Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / 86400000)
        })
      }
    }
  }, [filters, tableFilters])

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [DASHBOARD] Refreshing data...')
    if (filters.networks && filters.networks.length > 0) {
      await fetchData()
    }
  }, [fetchData, filters.networks])

  // Initial load - only fetch network options
  useEffect(() => {
    fetchNetworkOptions()
  }, [fetchNetworkOptions])

  // Data fetching - only when filters or tableFilters change and networks are selected
  useEffect(() => {
    if (filters.networks && filters.networks.length > 0) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, networkKey, dateRangeKey, filters.networks, tableFilters.offerName, tableFilters.subId, tableFilters.subId2])

  return (
    <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Show filter panel only when networks are selected */}
          {filters.networks && filters.networks.length > 0 && (
            <FilterPanel
              filters={draftFilters}
              onFiltersChange={setDraftFilters}
              availableNetworks={availableNetworks}
              availableOffers={availableOffers}
              availableSubIds={availableSubIds}
              isLoading={isLoading}
              onApply={handleApplyFilters}
              onRefresh={handleRefresh}
            />
          )}

          {/* Network Selection or Dashboard Content */}
          {!filters.networks || filters.networks.length === 0 ? (
            <NetworkSelector
              availableNetworks={availableNetworks}
              isLoading={isNetworkLoading}
              error={networkError}
              onRetry={fetchNetworkOptions}
              onNetworksSelected={(networkIds) => {
                const firstNetwork = networkIds[0]
                setDraftFilters(prev => ({ ...prev, networks: firstNetwork ? [firstNetwork] : [] }))
                setFilters(prev => ({ ...prev, networks: firstNetwork ? [firstNetwork] : [] }))
              }}
            />
          ) : (
            <>
              {/* KPI Cards */}
              <KPICards data={kpiData} isLoading={isLoading} />

              {/* Trends Chart */}
              <TrendsChart 
                data={trendData} 
                isLoading={isLoading}
                dateRange={filters.dateRange}
                networks={filters.networks}
              />

              {/* Table Filters */}
              <TableFilters
                filters={tableFilters}
                onFiltersChange={setTableFilters}
                availableOfferNames={availableOfferNames}
                availableSubIds={availableTableSubIds}
                availableSubIds2={availableTableSubIds2}
              />

              {/* Data Tables */}
              <div className="grid gap-6 xl:grid-cols-2">
                <ClicksTable 
                  data={clicksData} 
                  isLoading={isTableLoading}
                  totalCount={56289}
                  onExport={() => {
                    // TODO: Implement export functionality
                    console.log('Exporting clicks data...')
                  }}
                />
                <ConversionsTable 
                  data={conversionsData} 
                  isLoading={isTableLoading}
                  totalCount={15949}
                  onExport={() => {
                    // TODO: Implement export functionality
                    console.log('Exporting conversions data...')
                  }}
                />
              </div>
            </>
          )}
        </div>
      </main>
  )
}
