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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  return {
    dateRange: {
      from: startOfMonth, // First day of current month
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
      // Fetch summary data
      const summaryResponse = await fetch('/api/campaigns/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          networks: filters.networks,
          offers: filters.offers,
          subIds: filters.subIds
        })
      })

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setKpiData(summaryData.kpis)
        setTrendData(summaryData.trends)
      }

      // Fetch clicks data
      const clicksResponse = await fetch('/api/campaigns/clicks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          networks: filters.networks,
          offers: filters.offers,
          subIds: filters.subIds,
          tableFilters: tableFilters
        })
      })

      if (clicksResponse.ok) {
        const clicksResponseData = await clicksResponse.json()
        setClicksData(clicksResponseData.clicks)
      }

      // Fetch conversions data
      const conversionsResponse = await fetch('/api/campaigns/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          networks: filters.networks,
          offers: filters.offers,
          subIds: filters.subIds,
          tableFilters: tableFilters
        })
      })

      if (conversionsResponse.ok) {
        const conversionsResponseData = await conversionsResponse.json()
        setConversionsData(conversionsResponseData.conversions)
      }

      // Fetch filter options
      console.log('🎯 [FRONTEND] Fetching filter options from /api/campaigns/filters...')
      const filtersResponse = await fetch('/api/campaigns/filters')
      console.log('📥 [FRONTEND] Filters response status:', filtersResponse.status)
      
      if (filtersResponse.ok) {
        const filtersData = await filtersResponse.json()
        console.log('📋 [FRONTEND] Filters data received:', filtersData)
        console.log('🎯 [FRONTEND] Available offers:', filtersData.campaigns)
        
        setAvailableNetworks(filtersData.networks)
        setAvailableOffers(filtersData.campaigns)
        setAvailableSubIds(filtersData.subIds)
        
        // Set table filter options
        setAvailableOfferNames(['Playful Rewards - RevShare'])
        setAvailableTableSubIds(['aug301', ''])
        setAvailableTableSubIds2(['aug301', ''])
      } else {
        const errorText = await filtersResponse.text()
        console.error('❌ [FRONTEND] Failed to fetch filters:', filtersResponse.status, errorText)
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
          <div className="grid gap-6 lg:grid-cols-2">
            <ClicksTable 
              data={clicksData} 
              isLoading={isLoading}
              totalCount={56289}
            />
            <ConversionsTable 
              data={conversionsData} 
              isLoading={isLoading}
              totalCount={15949}
            />
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
