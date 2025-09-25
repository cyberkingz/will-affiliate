import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI } from '@/lib/api/affiliate-network'

export async function GET() {
  try {
    console.log('🔍 [FILTERS] Starting filters endpoint...')
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [FILTERS] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ [FILTERS] User authenticated:', user.id)

    // Fetch network connections from database
    console.log('📡 [FILTERS] Fetching network connections...')
    const { data: networkConnections } = await supabase
      .from('network_connections')
      .select('id, name, network_type, affiliate_id, api_key, is_active')
      .eq('is_active', true)

    console.log('📊 [FILTERS] Network connections found:', networkConnections?.length || 0)
    console.log('🔗 [FILTERS] Networks data:', networkConnections)

    // If no network connections, use Affluent as primary network
    let networks: Array<{ id: string; name: string; status: string }> = []
    if (networkConnections && networkConnections.length > 0) {
      networks = networkConnections.map(network => ({
        id: network.id,
        name: network.name,
        status: network.is_active ? 'active' : 'inactive'
      }))
    } else {
      console.log('📡 [FILTERS] Using Affluent as primary network')
      networks = [{
        id: 'affluent',
        name: 'Affluent',
        status: 'active'
      }]
    }

    // Initialize collections for campaigns and sub IDs
    let campaigns: Array<{ id: string; name: string }> = []
    const subIdSet = new Set<string>()
    const offerNamesSet = new Set<string>()

    // Fetch data from Affluent API
    console.log('🎯 [FILTERS] Starting campaign fetch from Affluent offers API...')
    
    const api = new AffiliateNetworkAPI({
      baseUrl: 'https://login.affluentco.com/affiliates/api',
      affiliateId: '208409',
      apiKey: 'Y0R1KxgxHpi2q88ZcYi7ag',
      name: 'affluent'
    })

    console.log('🔧 [FILTERS] API Config:', {
      baseUrl: 'https://login.affluentco.com/affiliates/api',
      affiliateId: '208409',
      hasApiKey: true,
      apiKey: 'Y0R1KxgxHpi2q88ZcYi7ag'
    })

    // Fetch offers for campaigns
    console.log('🚀 [FILTERS] Making API call to getOfferFeed...')
    const offersResponse = await api.getOfferFeed({ offer_status_id: 1 })
    
    console.log('📥 [FILTERS] Offers API Response:', {
      success: offersResponse.success,
      dataLength: offersResponse.data?.length || 0,
      message: offersResponse.message,
      hasData: !!offersResponse.data,
      rowCount: offersResponse.row_count
    })

    if (offersResponse.success && offersResponse.data) {
      console.log('📦 [FILTERS] First offer sample:', JSON.stringify(offersResponse.data[0], null, 2))
      console.log('✅ [FILTERS] Processing offers data for campaigns...')
      
      // Extract campaigns from offers with campaign_id
      const campaignsWithIds = offersResponse.data.filter(offer => offer.campaign_id)
      console.log('🎯 [FILTERS] Found offers with campaigns:', campaignsWithIds.length)

      // Create unique campaigns map
      const campaignsMap = new Map<string, string>()
      
      for (const offer of campaignsWithIds) {
        if (offer.campaign_id && offer.offer_name && typeof offer.offer_name === 'string') {
          campaignsMap.set(String(offer.campaign_id), offer.offer_name)
          offerNamesSet.add(offer.offer_name)
        }
      }

      campaigns = Array.from(campaignsMap.entries()).map(([id, name]) => ({ id, name }))
      console.log('🎯 [FILTERS] Unique campaigns extracted:', campaigns.length)
      console.log('📋 [FILTERS] Sample campaigns:', campaigns.slice(0, 5))
    }

    // Fetch clicks for sub IDs
    console.log('🏷️ [FILTERS] Starting sub IDs fetch from Affluent API...')
    console.log('🚀 [FILTERS] Making API call to getClicks for sub IDs...')
    
    // Calculate date range for last 30 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)
    
    const clicksResponse = await api.getClicks({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      row_limit: 10000,
      start_at_row: 1,
      include_duplicates: true
    })

    console.log('📥 [FILTERS] Clicks API Response:', {
      success: clicksResponse.success,
      dataLength: clicksResponse.data?.length || 0,
      message: clicksResponse.message
    })

    if (clicksResponse.success && clicksResponse.data) {
      console.log('✅ [FILTERS] Processing clicks data for sub IDs...')
      console.log('📊 [FILTERS] Total clicks to process:', clicksResponse.data.length)

      // Extract sub IDs from clicks
      let subid_1_clicks = 0, subid_2_clicks = 0, subid_3_clicks = 0, subid_4_clicks = 0, subid_5_clicks = 0

      for (const click of clicksResponse.data) {
        // Extract sub IDs
        if (click.subid_1) {
          subIdSet.add(String(click.subid_1).trim())
          subid_1_clicks++
        }
        if (click.subid_2) {
          subIdSet.add(String(click.subid_2).trim())
          subid_2_clicks++
        }
        if (click.subid_3) {
          subIdSet.add(String(click.subid_3).trim())
          subid_3_clicks++
        }
        if (click.subid_4) {
          subIdSet.add(String(click.subid_4).trim())
          subid_4_clicks++
        }
        if (click.subid_5) {
          subIdSet.add(String(click.subid_5).trim())
          subid_5_clicks++
        }

        // Extract offer names from clicks
        const offerName = click.offer?.offer_name || click.redirect_from_offer?.offer_name
        if (offerName && typeof offerName === 'string') {
          offerNamesSet.add(offerName.trim())
        }
      }

      console.log('🏷️ [FILTERS] Sub ID statistics:', {
        subid_1_clicks,
        subid_2_clicks,
        subid_3_clicks,
        subid_4_clicks,
        subid_5_clicks,
        unique_subids: subIdSet.size
      })
    }

    // Convert to sorted arrays
    const subIds = Array.from(subIdSet).filter(Boolean).sort()
    const offerNames = Array.from(offerNamesSet).filter(Boolean).sort()

    console.log('📋 [FILTERS] All unique sub IDs found:', subIds)
    
    const response = {
      networks,
      campaigns,
      subIds,
      subIds1: subIds, // For table filters sub ID 1
      subIds2: [], // We'll populate this separately if needed
      offerNames
    }

    console.log('📤 [FILTERS] Final response:', { 
      networksCount: response.networks.length, 
      campaignsCount: response.campaigns.length, 
      subIdsCount: response.subIds.length 
    })

    console.log('🎯 [FILTERS] Final campaigns:', campaigns)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [FILTERS] Critical error in filters endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
