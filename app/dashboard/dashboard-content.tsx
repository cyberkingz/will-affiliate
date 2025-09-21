'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { FilterPanel, FilterState } from '@/components/dashboard/filter-panel'
import { KPICards, KPIData } from '@/components/dashboard/kpi-cards'
import { TrendsChart, TrendData } from '@/components/dashboard/trends-chart'
import { CampaignsTable, CampaignTableData } from '@/components/dashboard/campaigns-table'
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
    roas: { value: 0, change: 0 }
  })

  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [campaignData, setCampaignData] = useState<CampaignTableData[]>([])
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

      // Fetch campaign table data
      const tableResponse = await fetch('/api/campaigns/table', {
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

      if (tableResponse.ok) {
        const tableData = await tableResponse.json()
        setCampaignData(tableData.campaigns)
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

  const handleCampaignClick = (campaignId: string) => {
    // Navigate to campaign details or open modal
    console.log('Campaign clicked:', campaignId)
  }

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

          {/* Campaigns Table */}
          <CampaignsTable 
            data={campaignData} 
            isLoading={isLoading}
            onCampaignClick={handleCampaignClick}
          />
        </div>
      </main>
    </DashboardLayout>
  )
}