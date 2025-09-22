'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { FilterPanel, FilterState } from '@/components/dashboard/filter-panel'
import { KPICards, KPIData } from '@/components/dashboard/kpi-cards'
import { TrendsChart, TrendData } from '@/components/dashboard/trends-chart'
import { ClicksTable, ClickData } from '@/components/dashboard/clicks-table'
import { ConversionsTable, ConversionData } from '@/components/dashboard/conversions-table'
import { TableFilters, TableFiltersState } from '@/components/dashboard/table-filters'
import { Database } from '@/types/supabase'

type User = Database['public']['Tables']['users']['Row']

interface DashboardContentProps {
  user: User
}

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
    networks: ['affluent'], // Default to Affluent network
    offers: [], // Empty means ALL offers
    subIds: [] // Empty means ALL sub IDs
  }
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters)

  const [kpiData, setKpiData] = useState<KPIData>({
    revenue: { value: 0, change: 0, period: '30d' },
    clicks: { value: 0, change: 0 },
    conversions: { value: 0, change: 0 },
    cvr: { value: 0, change: 0 },
    epc: { value: 0, change: 0 },
    roas: { value: 0, change: 0 },
    peakHour: { value: '--', clicks: 0 }
  })

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

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    
    const formattedStartDate = formatDateForAPI(filters.dateRange.from)
    const formattedEndDate = formatDateForAPI(filters.dateRange.to)
    
    console.log('📅 [FRONTEND] Date debugging:', {
      originalFrom: filters.dateRange.from.toString(),
      originalTo: filters.dateRange.to.toString(),
      formattedStartDate,
      formattedEndDate,
      currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
    
    try {
      // Prepare common request body
      const requestBody = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        networks: filters.networks,
        offers: filters.offers,
        subIds: filters.subIds
      }

      const tableRequestBody = {
        ...requestBody,
        campaigns: filters.offers, // Note: API expects 'campaigns' not 'offers'
        tableFilters: tableFilters,
        page: 1,
        limit: 50
      }

      // Run all API calls in parallel to avoid race conditions
      const [
        summaryResponse,
        clicksResponse, 
        conversionsResponse,
        filtersResponse
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
        }),
        fetch('/api/campaigns/filters')
      ])

      // Handle summary response
      if (summaryResponse.status === 'fulfilled' && summaryResponse.value.ok) {
        const summaryData = await summaryResponse.value.json()
        setKpiData(summaryData.kpis)
        setTrendData(summaryData.trends)
      } else {
        console.error('❌ [DASHBOARD] Summary API failed:', summaryResponse)
      }

      // Handle clicks response
      if (clicksResponse.status === 'fulfilled' && clicksResponse.value.ok) {
        const clicksResponseData = await clicksResponse.value.json()
        console.log('📊 [DASHBOARD] Clicks response:', clicksResponseData)
        setClicksData(clicksResponseData.clicks || [])
      } else {
        console.error('❌ [DASHBOARD] Clicks API failed:', clicksResponse)
        setClicksData([])
      }

      // Handle conversions response
      if (conversionsResponse.status === 'fulfilled' && conversionsResponse.value.ok) {
        const conversionsResponseData = await conversionsResponse.value.json()
        console.log('📊 [DASHBOARD] Conversions response:', conversionsResponseData)
        setConversionsData(conversionsResponseData.conversions || [])
      } else {
        console.error('❌ [DASHBOARD] Conversions API failed:', conversionsResponse)
        setConversionsData([])
      }

      // Handle filters response
      if (filtersResponse.status === 'fulfilled' && filtersResponse.value.ok) {
        const filtersData = await filtersResponse.value.json()
        console.log('📋 [FRONTEND] Filters data received:', filtersData)
        console.log('🎯 [FRONTEND] Available offers:', filtersData.campaigns)
        
        setAvailableNetworks(filtersData.networks)
        setAvailableOffers(filtersData.campaigns)
        setAvailableSubIds(filtersData.subIds)
        
        // Set table filter options from real data
        // Extract unique offer names from campaigns
        const offerNames = filtersData.campaigns?.map((c: { name: string }) => c.name).filter(Boolean) as string[] || []
        setAvailableOfferNames([...new Set(offerNames)])
        
        // Use separate sub ID arrays from the API for proper filtering
        const subIds1 = filtersData.subIds1 || []
        const subIds2 = filtersData.subIds2 || []
        setAvailableTableSubIds(subIds1)  // Sub ID 1 values only
        setAvailableTableSubIds2(subIds2) // Sub ID 2 values only (empty in current dataset)
      } else {
        console.error('❌ [FRONTEND] Filters API failed:', filtersResponse)
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
    <DashboardLayout user={user}>
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            availableNetworks={availableNetworks}
            availableOffers={availableOffers}
            availableSubIds={availableSubIds}
            isLoading={isLoading}
          />

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
        </div>
      </main>
    </DashboardLayout>
  )
}
