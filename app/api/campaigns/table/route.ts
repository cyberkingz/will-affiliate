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
      return NextResponse.json({ campaigns: [] })
    }

    // Build query
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

    const { data: performanceData, error } = await query

    if (error) {
      console.error('Error fetching performance data:', error)
      throw error
    }

    // Group by campaign and aggregate
    const campaignGroups = (performanceData || []).reduce((acc, row) => {
      const key = `${row.campaign_id}-${row.network_connection_id}`
      
      if (!acc[key]) {
        acc[key] = {
          id: row.campaign_id,
          name: row.campaign_name || row.campaign_id,
          network: row.network_name,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          spend: 0,
          status: 'active' as const // This would come from campaign status if available
        }
      }
      
      acc[key].clicks += row.clicks || 0
      acc[key].conversions += row.conversions || 0
      acc[key].revenue += row.revenue || 0
      acc[key].spend += row.ad_spend || 0
      
      return acc
    }, {} as Record<string, {
      id: string;
      name: string;
      network: string;
      clicks: number;
      conversions: number;
      revenue: number;
      spend: number;
      status: string;
    }>)

    // Calculate derived metrics and format for table
    const campaignsData = Object.values(campaignGroups).map((campaign) => ({
      ...campaign,
      cvr: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0,
      epc: campaign.clicks > 0 ? campaign.revenue / campaign.clicks : 0,
      roas: campaign.spend > 0 ? campaign.revenue / campaign.spend : 0,
      profit: campaign.revenue - campaign.spend
    }))

    // Sort by revenue desc
    campaigns.sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({ campaigns: campaignsData })
  } catch (error) {
    console.error('Error fetching campaigns table data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}