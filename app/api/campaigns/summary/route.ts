import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, networks, campaigns, subIds } = body

    // Check cache first
    const cacheKey = createCacheKey('summary', { 
      userId: user.id, 
      startDate, 
      endDate, 
      networks, 
      campaigns, 
      subIds 
    })
    
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Get user's accessible networks
    const { data: userNetworks } = await supabase
      .rpc('get_user_accessible_networks', { target_user_id: user.id })

    const accessibleNetworkIds = userNetworks?.map(n => n.network_id) || []
    
    if (accessibleNetworkIds.length === 0) {
      return NextResponse.json({
        kpis: {
          revenue: { value: 0, change: 0, period: '30d' },
          clicks: { value: 0, change: 0 },
          conversions: { value: 0, change: 0 },
          cvr: { value: 0, change: 0 },
          epc: { value: 0, change: 0 },
          roas: { value: 0, change: 0 }
        },
        trends: []
      })
    }

    // Build filters
    let query = supabase
      .from('campaign_performance_view')
      .select('*')
      .in('network_connection_id', accessibleNetworkIds)
      .gte('day', startDate)
      .lte('day', endDate)

    if (networks && networks.length > 0) {
      query = query.in('network_connection_id', networks)
    }

    if (campaigns && campaigns.length > 0) {
      query = query.in('campaign_id', campaigns)
    }

    const { data: currentPeriodData, error } = await query

    if (error) {
      console.error('Error fetching current period data:', error)
      throw error
    }

    // Calculate previous period for comparison
    const currentStart = new Date(startDate)
    const currentEnd = new Date(endDate)
    const periodDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))
    
    const previousStart = new Date(currentStart.getTime() - (periodDays * 24 * 60 * 60 * 1000))
    const previousEnd = new Date(currentStart.getTime() - (24 * 60 * 60 * 1000))

    let previousQuery = supabase
      .from('campaign_performance_view')
      .select('*')
      .in('network_connection_id', accessibleNetworkIds)
      .gte('day', previousStart.toISOString())
      .lte('day', previousEnd.toISOString())

    if (networks && networks.length > 0) {
      previousQuery = previousQuery.in('network_connection_id', networks)
    }

    if (campaigns && campaigns.length > 0) {
      previousQuery = previousQuery.in('campaign_id', campaigns)
    }

    const { data: previousPeriodData } = await previousQuery

    // Calculate aggregates
    const currentMetrics = calculateMetrics(currentPeriodData || [])
    const previousMetrics = calculateMetrics(previousPeriodData || [])

    // Calculate percentage changes
    const kpis = {
      revenue: {
        value: currentMetrics.revenue,
        change: calculatePercentageChange(currentMetrics.revenue, previousMetrics.revenue),
        period: `${periodDays}d`
      },
      clicks: {
        value: currentMetrics.clicks,
        change: calculatePercentageChange(currentMetrics.clicks, previousMetrics.clicks)
      },
      conversions: {
        value: currentMetrics.conversions,
        change: calculatePercentageChange(currentMetrics.conversions, previousMetrics.conversions)
      },
      cvr: {
        value: currentMetrics.cvr,
        change: calculatePercentageChange(currentMetrics.cvr, previousMetrics.cvr)
      },
      epc: {
        value: currentMetrics.epc,
        change: calculatePercentageChange(currentMetrics.epc, previousMetrics.epc)
      },
      roas: {
        value: currentMetrics.roas,
        change: calculatePercentageChange(currentMetrics.roas, previousMetrics.roas)
      }
    }

    // Generate trends data
    const trends = generateTrendsData(currentPeriodData || [])
    
    // Find peak hour from trends data
    const peakHour = trends.reduce((max, current) => 
      current.clicks > max.clicks ? current : max
    )
    
    // Add peakHour to KPIs
    kpis.peakHour = {
      value: peakHour.hour,
      clicks: peakHour.clicks
    }

    const responseData = { kpis, trends }
    
    // Cache the response for 2 minutes
    apiCache.set(cacheKey, responseData, 2)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateMetrics(data: any[]) {
  const totals = data.reduce(
    (acc, row) => ({
      revenue: acc.revenue + (row.revenue || 0),
      clicks: acc.clicks + (row.clicks || 0),
      conversions: acc.conversions + (row.conversions || 0),
      adSpend: acc.adSpend + (row.ad_spend || 0)
    }),
    { revenue: 0, clicks: 0, conversions: 0, adSpend: 0 }
  )

  return {
    revenue: totals.revenue,
    clicks: totals.clicks,
    conversions: totals.conversions,
    cvr: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
    epc: totals.clicks > 0 ? totals.revenue / totals.clicks : 0,
    roas: totals.adSpend > 0 ? totals.revenue / totals.adSpend : 0
  }
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function generateTrendsData(data: any[]) {
  // Generate hourly data for today (24 hours)
  const today = new Date()
  const hourlyData: any[] = []
  
  // Create 24 hours of data
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00'
    const timeFormatted = hour
    
    // Generate sample data based on time patterns (higher in afternoon/evening)
    const baseClicks = Math.floor(Math.random() * 200) + 50
    const timeMultiplier = getTimeMultiplier(i)
    const clicks = Math.floor(baseClicks * timeMultiplier)
    const conversions = Math.floor(clicks * (Math.random() * 0.05 + 0.02)) // 2-7% CVR
    const revenue = conversions * (Math.random() * 50 + 30) // $30-80 per conversion
    
    hourlyData.push({
      hour,
      time: timeFormatted,
      revenue: Math.round(revenue * 100) / 100,
      clicks,
      conversions,
      spend: Math.round(revenue * 0.7 * 100) / 100 // 70% ROAS
    })
  }
  
  return hourlyData
}

function getTimeMultiplier(hour: number): number {
  // Higher traffic during business hours and evening
  if (hour >= 9 && hour <= 11) return 1.5 // Morning peak
  if (hour >= 14 && hour <= 16) return 2.0 // Afternoon peak  
  if (hour >= 19 && hour <= 21) return 2.2 // Evening peak
  if (hour >= 22 || hour <= 6) return 0.3 // Night low
  return 1.0 // Default
}