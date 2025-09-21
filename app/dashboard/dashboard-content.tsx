'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const [syncStatus, setSyncStatus] = useState({
    isActive: false,
    lastSync: null as string | null
  })

  // Available filter options
  const [availableNetworks, setAvailableNetworks] = useState<Array<{ id: string; name: string }>>([])
  const [availableOffers, setAvailableOffers] = useState<Array<{ id: string; name: string }>>([])
  const [availableSubIds, setAvailableSubIds] = useState<string[]>([])
  const [availableOfferNames, setAvailableOfferNames] = useState<string[]>([])
  const [availableTableSubIds, setAvailableTableSubIds] = useState<string[]>([])
  const [availableTableSubIds2, setAvailableTableSubIds2] = useState<string[]>([])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch summary data
      const summaryResponse = await fetch('/api/campaigns/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: filters.dateRange.from.toISOString(),
          endDate: filters.dateRange.to.toISOString(),
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
          startDate: filters.dateRange.from.toISOString(),
          endDate: filters.dateRange.to.toISOString(),
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
          startDate: filters.dateRange.from.toISOString(),
          endDate: filters.dateRange.to.toISOString(),
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

      // Fetch sync status
      const syncResponse = await fetch('/api/health/sync-status')
      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        setSyncStatus(syncData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filtersString = useMemo(() => JSON.stringify(filters), [filters])
  const tableFiltersString = useMemo(() => JSON.stringify(tableFilters), [tableFilters])

  useEffect(() => {
    fetchData()
  }, [filtersString, tableFiltersString])


  const handleRefresh = () => {
    fetchData()
  }

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
          <TrendsChart data={trendData} isLoading={isLoading} />

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