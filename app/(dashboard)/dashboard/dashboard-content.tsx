'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

const areFilterStatesEqual = (a: FilterState, b: FilterState): boolean =>
  a.dateRange.from.getTime() === b.dateRange.from.getTime() &&
  a.dateRange.to.getTime() === b.dateRange.to.getTime() &&
  arraysEqual(a.networks, b.networks) &&
  arraysEqual(a.offers, b.offers) &&
  arraysEqual(a.subIds, b.subIds)

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
  // Available filter options
  const [availableNetworks, setAvailableNetworks] = useState<Array<{ id: string; name: string }>>([])
  const [availableOffers, setAvailableOffers] = useState<Array<{ id: string; name: string }>>([])
  const [availableSubIds, setAvailableSubIds] = useState<string[]>([])
  const [availableOfferNames, setAvailableOfferNames] = useState<string[]>([])
  const [availableTableSubIds, setAvailableTableSubIds] = useState<string[]>([])
  const [availableTableSubIds2, setAvailableTableSubIds2] = useState<string[]>([])
  const selectedNetworks = filters.networks

  useEffect(() => {
    setDraftFilters(cloneFilterState(filters))
  }, [filters])

  const hasPendingChanges = useMemo(() => !areFilterStatesEqual(filters, draftFilters), [filters, draftFilters])

  const handleApplyFilters = useCallback(() => {
    setFilters(cloneFilterState(draftFilters))
  }, [draftFilters])

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
    setIsLoading(true)
    
    try {
      // Only fetch network connections from database - no external API calls
      const response = await fetch('/api/networks/list')
      
      if (response.ok) {
        const data = await response.json()
        setAvailableNetworks(data.networks || [])
      } else {
        console.error('❌ [FRONTEND] Networks API failed:', response.status)
        setAvailableNetworks([])
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error fetching networks:', error)
      setAvailableNetworks([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    // Don't fetch data if no networks are selected
    if (!filters.networks || filters.networks.length === 0) {
      console.log('🚫 [FRONTEND] Skipping data fetch - no networks selected')
      return
    }

    setIsLoading(true)

    try {
      // First, fetch basic filters from the filters endpoint
      const filtersResponse = await fetch('/api/campaigns/filters')
      let filtersData: FiltersApiResponse | null = null

      if (filtersResponse.ok) {
        filtersData = await filtersResponse.json() as FiltersApiResponse
        console.log('📋 [FRONTEND] Basic filters data received:', filtersData)
        setAvailableNetworks(filtersData.networks)
        
        // Use the basic filters data for table filters if available
        if (filtersData.offerNames && filtersData.offerNames.length > 0) {
          console.log('🎯 [FRONTEND] Setting offer names from basic filters:', filtersData.offerNames.length)
          setAvailableOfferNames(filtersData.offerNames)
        }
        
        if (filtersData.subIds1 && filtersData.subIds1.length > 0) {
          console.log('🎯 [FRONTEND] Setting sub IDs from basic filters:', filtersData.subIds1.length)
          setAvailableTableSubIds(filtersData.subIds1)
        }
        
        if (filtersData.subIds2 && filtersData.subIds2.length > 0) {
          console.log('🎯 [FRONTEND] Setting sub IDs 2 from basic filters:', filtersData.subIds2.length)
          setAvailableTableSubIds2(filtersData.subIds2)
        }
        
        // Also set the main filter options
        if (filtersData.campaigns && filtersData.campaigns.length > 0) {
          setAvailableOffers(filtersData.campaigns)
        }
        
        if (filtersData.subIds && filtersData.subIds.length > 0) {
          setAvailableSubIds(filtersData.subIds)
        }
      } else {
        console.error('❌ [FRONTEND] Basic filters API failed:', filtersResponse.status)
        setAvailableNetworks([])
      }

      // Then, fetch live filter options based on actual data
      const formattedStartDate = formatDateForAPI(filters.dateRange.from)
      const formattedEndDate = formatDateForAPI(filters.dateRange.to)

      console.log('🔍 [FRONTEND] About to call live-filters API with:', {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        networks: filters.networks
      })

      const liveFiltersResponse = await fetch('/api/campaigns/live-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          networks: filters.networks
        })
      })

      console.log('📡 [FRONTEND] Live filters response status:', liveFiltersResponse.status)

      if (liveFiltersResponse.ok) {
        const liveFiltersData = await liveFiltersResponse.json() as FiltersApiResponse
        console.log('📋 [FRONTEND] Live filters data received:', liveFiltersData)
        console.log('🎯 [FRONTEND] Live available offers:', liveFiltersData.campaigns)
        console.log('🔍 [FRONTEND] Live Sub IDs:', liveFiltersData.subIds1?.slice(0, 10))
        console.log('🔍 [FRONTEND] Live Sub IDs 2:', liveFiltersData.subIds2?.slice(0, 10))

        // Use live data for offers and sub IDs
        setAvailableOffers(liveFiltersData.campaigns || [])
        setAvailableSubIds(liveFiltersData.subIds || [])

        const offerNames = liveFiltersData.offerNames || liveFiltersData.campaigns?.map((c: { name: string }) => c.name).filter(Boolean) as string[] || []
        setAvailableOfferNames([...new Set(offerNames)])

        const subIds1 = liveFiltersData.subIds1 || liveFiltersData.subIds || []
        const subIds2 = liveFiltersData.subIds2 || []
        console.log('🎯 [FRONTEND] Setting table sub IDs:', { subIds1Length: subIds1.length, subIds2Length: subIds2.length })
        console.log('🎯 [FRONTEND] Sample table sub IDs 1:', subIds1.slice(0, 5))
        console.log('🎯 [FRONTEND] Sample table sub IDs 2:', subIds2.slice(0, 5))
        setAvailableTableSubIds(subIds1)
        setAvailableTableSubIds2(subIds2)
      } else {
        console.error('❌ [FRONTEND] Live filters API failed:', liveFiltersResponse.status)
        // Fallback to basic filters data if available
        if (filtersData) {
          setAvailableOffers(filtersData.campaigns || [])
          setAvailableSubIds(filtersData.subIds || [])
          const offerNames = filtersData.campaigns?.map((c: { name: string }) => c.name).filter(Boolean) as string[] || []
          setAvailableOfferNames([...new Set(offerNames)])
          setAvailableTableSubIds(filtersData.subIds1 || [])
          setAvailableTableSubIds2(filtersData.subIds2 || [])
        } else {
          setAvailableOffers([])
          setAvailableSubIds([])
          setAvailableOfferNames([])
          setAvailableTableSubIds([])
          setAvailableTableSubIds2([])
        }
      }

      let effectiveNetworks = filters.networks

      if (Array.isArray(filtersData?.networks)) {
        const accessibleNetworkIds = new Set(
          filtersData.networks.map((network: { id: string }) => network.id)
        )

        const filteredNetworks = filters.networks
          .filter(id => accessibleNetworkIds.has(id))
          .slice(0, 1)

      if (filteredNetworks.length !== filters.networks.length) {
        setFilters(prev => ({ ...prev, networks: filteredNetworks }))
      }

      effectiveNetworks = filteredNetworks
      }

      if (effectiveNetworks.length > 1) {
        effectiveNetworks = effectiveNetworks.slice(0, 1)
        setFilters(prev => ({ ...prev, networks: effectiveNetworks }))
      }

      if (!effectiveNetworks || effectiveNetworks.length === 0) {
        setKpiData(createDefaultKpiData())
        setTrendData([])
        setClicksData([])
        setConversionsData([])
        return
      }

      console.log('📅 [FRONTEND] Date debugging:', {
        originalFrom: filters.dateRange.from.toString(),
        originalTo: filters.dateRange.to.toString(),
        formattedStartDate,
        formattedEndDate,
        currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      const requestBody = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        networks: effectiveNetworks,
        offers: filters.offers,
        subIds: filters.subIds
      }

      const [summaryResponse] = await Promise.allSettled([
        fetch('/api/campaigns/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      ])

      if (summaryResponse.status === 'fulfilled') {
        if (summaryResponse.value.ok) {
          const summaryData = await summaryResponse.value.json()
          setKpiData(summaryData.kpis)
          setTrendData(summaryData.trends)
        } else {
          console.error('❌ [DASHBOARD] Summary API failed:', summaryResponse.value.status)
        }
      } else {
        console.error('❌ [DASHBOARD] Summary API promise rejected:', summaryResponse.reason)
      }

      // Table data will be fetched separately
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Separate function for table data that doesn't affect main dashboard
  const fetchTableData = useCallback(async () => {
    // Don't fetch table data if no networks are selected
    if (!filters.networks || filters.networks.length === 0) {
      console.log('🚫 [TABLE-DATA] Skipping table data fetch - no networks selected')
      setClicksData([])
      setConversionsData([])
      return
    }

    setIsTableLoading(true)

    try {
      const formattedStartDate = formatDateForAPI(filters.dateRange.from)
      const formattedEndDate = formatDateForAPI(filters.dateRange.to)

      const tableRequestBody = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        networks: filters.networks,
        campaigns: filters.offers,
        tableFilters: tableFilters,
        page: 1,
        limit: 50
      }

      console.log('📊 [TABLE-DATA] Fetching table data with filters:', tableFilters)

      const [clicksResponse, conversionsResponse] = await Promise.allSettled([
        fetch('/api/campaigns/real-clicks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tableRequestBody)
        }),
        fetch('/api/campaigns/real-conversions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tableRequestBody)
        })
      ])

      if (clicksResponse.status === 'fulfilled') {
        if (clicksResponse.value.ok) {
          const clicksResponseData = await clicksResponse.value.json()
          console.log('📊 [TABLE-DATA] Clicks response:', clicksResponseData)
          setClicksData(clicksResponseData.clicks || [])
        } else {
          console.error('❌ [TABLE-DATA] Clicks API failed:', clicksResponse.value.status)
          setClicksData([])
        }
      } else {
        console.error('❌ [TABLE-DATA] Clicks API promise rejected:', clicksResponse.reason)
        setClicksData([])
      }

      if (conversionsResponse.status === 'fulfilled') {
        if (conversionsResponse.value.ok) {
          const conversionsResponseData = await conversionsResponse.value.json()
          console.log('📊 [TABLE-DATA] Conversions response:', conversionsResponseData)
          setConversionsData(conversionsResponseData.conversions || [])
        } else {
          console.error('❌ [TABLE-DATA] Conversions API failed:', conversionsResponse.value.status)
          setConversionsData([])
        }
      } else {
        console.error('❌ [TABLE-DATA] Conversions API promise rejected:', conversionsResponse.reason)
        setConversionsData([])
      }
    } catch (error) {
      console.error('❌ [TABLE-DATA] Error fetching table data:', error)
    } finally {
      setIsTableLoading(false)
    }
  }, [filters, tableFilters])

  // Initial load - only fetch network options
  useEffect(() => {
    fetchNetworkOptions()
  }, [fetchNetworkOptions])

  // Data fetching - only when filters change and networks are selected
  useEffect(() => {
    if (filters.networks && filters.networks.length > 0) {
      fetchData()
    }
  }, [fetchData, filters.networks])

  // Table data fetching - separate from main dashboard data
  useEffect(() => {
    if (filters.networks && filters.networks.length > 0) {
      fetchTableData()
    }
  }, [fetchTableData])

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
              hasPendingChanges={hasPendingChanges}
            />
          )}

          {/* Network Selection or Dashboard Content */}
          {!filters.networks || filters.networks.length === 0 ? (
            <NetworkSelector
              availableNetworks={availableNetworks}
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
