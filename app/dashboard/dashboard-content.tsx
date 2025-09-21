'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { FilterPanel, FilterState } from '@/components/dashboard/filter-panel'
import { KPICards, KPIData } from '@/components/dashboard/kpi-cards'
import { TrendsChart, TrendData } from '@/components/dashboard/trends-chart'
import { ClicksTable, ClickData } from '@/components/dashboard/clicks-table'
import { ConversionsTable, ConversionData } from '@/components/dashboard/conversions-table'
import { Database } from '@/types/supabase'

type User = Database['public']['Tables']['users']['Row']

interface DashboardContentProps {
  user: User
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    },
    networks: [],
    campaigns: [],
    subIds: []
  })

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
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState({
    isActive: false,
    lastSync: null as string | null
  })

  // Available filter options
  const [availableNetworks, setAvailableNetworks] = useState<Array<{ id: string; name: string }>>([])
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [availableSubIds, setAvailableSubIds] = useState<string[]>([])

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
          campaigns: filters.campaigns,
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
          campaigns: filters.campaigns,
          subIds: filters.subIds
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
          campaigns: filters.campaigns,
          subIds: filters.subIds
        })
      })

      if (conversionsResponse.ok) {
        const conversionsResponseData = await conversionsResponse.json()
        setConversionsData(conversionsResponseData.conversions)
      }

      // Fetch filter options
      const filtersResponse = await fetch('/api/campaigns/filters')
      if (filtersResponse.ok) {
        const filtersData = await filtersResponse.json()
        setAvailableNetworks(filtersData.networks)
        setAvailableCampaigns(filtersData.campaigns)
        setAvailableSubIds(filtersData.subIds)
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

  useEffect(() => {
    fetchData()
  }, [filters])


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
            availableCampaigns={availableCampaigns}
            availableSubIds={availableSubIds}
            isLoading={isLoading}
          />

          {/* KPI Cards */}
          <KPICards data={kpiData} isLoading={isLoading} />

          {/* Trends Chart */}
          <TrendsChart data={trendData} isLoading={isLoading} />

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