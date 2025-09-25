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

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      const filtersResponse = await fetch('/api/campaigns/filters')

      let filtersData: FiltersApiResponse | null = null

      if (filtersResponse.ok) {
        filtersData = await filtersResponse.json() as FiltersApiResponse
        console.log('📋 [FRONTEND] Filters data received:', filtersData)
        console.log('🎯 [FRONTEND] Available offers:', filtersData.campaigns)

        setAvailableNetworks(filtersData.networks)
        setAvailableOffers(filtersData.campaigns)
        setAvailableSubIds(filtersData.subIds)

        const offerNames = filtersData.campaigns?.map((c: { name: string }) => c.name).filter(Boolean) as string[] || []
        setAvailableOfferNames([...new Set(offerNames)])

        const subIds1 = filtersData.subIds1 || []
        const subIds2 = filtersData.subIds2 || []
        setAvailableTableSubIds(subIds1)
        setAvailableTableSubIds2(subIds2)
      } else {
        console.error('❌ [FRONTEND] Filters API failed:', filtersResponse.status)
        setAvailableNetworks([])
        setAvailableOffers([])
        setAvailableSubIds([])
        setAvailableOfferNames([])
        setAvailableTableSubIds([])
        setAvailableTableSubIds2([])
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

      const formattedStartDate = formatDateForAPI(filters.dateRange.from)
      const formattedEndDate = formatDateForAPI(filters.dateRange.to)

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

      const tableRequestBody = {
        ...requestBody,
        campaigns: filters.offers,
        tableFilters: tableFilters,
        page: 1,
        limit: 50
      }

      const [
        summaryResponse,
        clicksResponse,
        conversionsResponse
      ] = await Promise.allSettled([
        fetch('/api/campaigns/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }),
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

      if (clicksResponse.status === 'fulfilled') {
        if (clicksResponse.value.ok) {
          const clicksResponseData = await clicksResponse.value.json()
          console.log('📊 [DASHBOARD] Clicks response:', clicksResponseData)
          setClicksData(clicksResponseData.clicks || [])
        } else {
          console.error('❌ [DASHBOARD] Clicks API failed:', clicksResponse.value.status)
          setClicksData([])
        }
      } else {
        console.error('❌ [DASHBOARD] Clicks API promise rejected:', clicksResponse.reason)
        setClicksData([])
      }

      if (conversionsResponse.status === 'fulfilled') {
        if (conversionsResponse.value.ok) {
          const conversionsResponseData = await conversionsResponse.value.json()
          console.log('📊 [DASHBOARD] Conversions response:', conversionsResponseData)
          setConversionsData(conversionsResponseData.conversions || [])
        } else {
          console.error('❌ [DASHBOARD] Conversions API failed:', conversionsResponse.value.status)
          setConversionsData([])
        }
      } else {
        console.error('❌ [DASHBOARD] Conversions API promise rejected:', conversionsResponse.reason)
        setConversionsData([])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, tableFilters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
                  isLoading={isLoading}
                  totalCount={56289}
                  onExport={() => {
                    // TODO: Implement export functionality
                    console.log('Exporting clicks data...')
                  }}
                />
                <ConversionsTable 
                  data={conversionsData} 
                  isLoading={isLoading}
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
