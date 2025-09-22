import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: campaignId } = await context.params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const networkId = searchParams.get('networkId')

    // Get user's accessible networks
    const { data: userNetworks } = await supabase
      .rpc('get_user_accessible_networks', { target_user_id: user.id })

    const accessibleNetworkIds = userNetworks?.map(n => n.network_id) || []
    
    if (accessibleNetworkIds.length === 0) {
      return NextResponse.json({ error: 'No accessible networks' }, { status: 403 })
    }

    // Build base query
    let query = supabase
      .from('campaigns_data')
      .select(`
        *,
        network_connections!inner(id, name, network_type)
      `)
      .eq('campaign_id', campaignId)
      .in('network_connection_id', accessibleNetworkIds)

    if (networkId) {
      query = query.eq('network_connection_id', networkId)
    }

    if (startDate) {
      query = query.gte('day', startDate)
    }

    if (endDate) {
      query = query.lte('day', endDate)
    }

    const { data: campaignData, error } = await query.order('day', { ascending: false })

    if (error) {
      console.error('Error fetching campaign details:', error)
      throw error
    }

    if (!campaignData || campaignData.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get ad spend data for the same period
    let spendQuery = supabase
      .from('ad_spend_entries')
      .select('*')
      .eq('campaign_id', campaignId)

    if (networkId) {
      spendQuery = spendQuery.eq('network_connection_id', networkId)
    }

    if (startDate) {
      spendQuery = spendQuery.gte('day', startDate)
    }

    if (endDate) {
      spendQuery = spendQuery.lte('day', endDate)
    }

    const { data: spendData } = await spendQuery

    // Create a map of spend by day
    const spendByDay = (spendData || []).reduce((acc, spend) => {
      acc[spend.day] = (acc[spend.day] || 0) + spend.amount
      return acc
    }, {} as Record<string, number>)

    // Calculate metrics for each day
    const dailyMetrics = campaignData.map(day => {
      const adSpend = spendByDay[day.day] || 0
      const cvr = day.clicks > 0 ? (day.conversions / day.clicks) * 100 : 0
      const epc = day.clicks > 0 ? day.revenue / day.clicks : 0
      const roas = adSpend > 0 ? day.revenue / adSpend : 0
      const profit = day.revenue - adSpend

      return {
        ...day,
        ad_spend: adSpend,
        cvr,
        epc,
        roas,
        profit
      }
    })

    // Calculate totals
    const totals = dailyMetrics.reduce(
      (acc, day) => ({
        clicks: acc.clicks + day.clicks,
        conversions: acc.conversions + day.conversions,
        revenue: acc.revenue + day.revenue,
        spend: acc.spend + day.ad_spend,
        impressions: acc.impressions + (day.impressions || 0)
      }),
      { clicks: 0, conversions: 0, revenue: 0, spend: 0, impressions: 0 }
    )

    const summary = {
      campaign_id: campaignId,
      campaign_name: campaignData[0].campaign_name,
      network: campaignData[0].network_connections,
      totals: {
        ...totals,
        cvr: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        epc: totals.clicks > 0 ? totals.revenue / totals.clicks : 0,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        profit: totals.revenue - totals.spend
      },
      daily_data: dailyMetrics
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching campaign details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
