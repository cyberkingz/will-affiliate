import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's accessible networks
    const { data: userNetworks } = await supabase
      .rpc('get_user_accessible_networks', { target_user_id: user.id })

    const networkIds = userNetworks?.map(n => n.network_id) || []

    if (networkIds.length === 0) {
      return NextResponse.json({
        networks: [],
        campaigns: [],
        subIds: []
      })
    }

    // Get available networks
    const { data: networks } = await supabase
      .from('network_connections')
      .select('id, name')
      .in('id', networkIds)
      .eq('is_active', true)

    // Get available campaigns
    const { data: campaignsData } = await supabase
      .from('campaigns_data')
      .select('campaign_id, campaign_name')
      .in('network_connection_id', networkIds)
      .not('campaign_name', 'is', null)

    // Deduplicate campaigns
    const uniqueCampaigns = campaignsData?.reduce((acc, curr) => {
      if (!acc.find(c => c.id === curr.campaign_id)) {
        acc.push({
          id: curr.campaign_id,
          name: curr.campaign_name || curr.campaign_id
        })
      }
      return acc
    }, [] as Array<{ id: string; name: string }>) || []

    // Get available sub IDs
    const { data: subIdsData } = await supabase
      .from('campaigns_data')
      .select('sub_id')
      .in('network_connection_id', networkIds)
      .not('sub_id', 'is', null)

    const uniqueSubIds = [...new Set(subIdsData?.map(s => s.sub_id).filter(Boolean))] || []

    return NextResponse.json({
      networks: networks || [],
      campaigns: uniqueCampaigns,
      subIds: uniqueSubIds
    })
  } catch (error) {
    console.error('Error fetching filter options:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}