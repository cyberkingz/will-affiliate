import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    return NextResponse.json({ kpis, trends })
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
  const dailyData = data.reduce((acc, row) => {
    const date = row.day
    if (!acc[date]) {
      acc[date] = {
        date,
        revenue: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      }
    }
    
    acc[date].revenue += row.revenue || 0
    acc[date].clicks += row.clicks || 0
    acc[date].conversions += row.conversions || 0
    acc[date].spend += row.ad_spend || 0
    
    return acc
  }, {} as Record<string, any>)

  return Object.values(dailyData).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}