import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig } from '@/lib/api/affiliate-network'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get network from query params
    const { searchParams } = new URL(request.url)
    const networkId = searchParams.get('network') || 'affluent'
    
    console.log('🎯 [NETWORK-CAMPAIGNS] Fetching campaigns for network:', networkId)

    // For now, we only support Affluent network
    if (networkId !== 'affluent') {
      return NextResponse.json({ 
        campaigns: [],
        message: `Network ${networkId} not supported yet` 
      })
    }

    try {
      // Use direct fetch since API client has issues
      console.log('🚀 [NETWORK-CAMPAIGNS] Getting campaigns from Offers Feed (direct fetch)...')
      
      const directUrl = `https://login.affluentco.com/affiliates/api/Offers/Feed?affiliate_id=208409&api_key=Y0R1KxgxHpi2q88ZcYi7ag&offer_status_id=1`
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const offersResponse = await response.json()
      
      console.log('📥 [NETWORK-CAMPAIGNS] Offers response:', {
        success: offersResponse.success,
        dataLength: offersResponse.data?.length || 0,
        rowCount: offersResponse.row_count
      })

      let campaigns = []

      if (offersResponse.success && offersResponse.data.length > 0) {
        console.log('✅ [NETWORK-CAMPAIGNS] Processing offers for campaigns...')
        
        // Extract offers (what affiliates choose to promote)
        let offersProcessed = 0
        
        offersResponse.data.forEach(offer => {
          if (offer.offer_id && offer.offer_name) {
            campaigns.push({
              id: offer.offer_id.toString(),
              name: offer.offer_name,
              campaignId: offer.campaign_id,
              status: offer.offer_status?.offer_status_name || 'Unknown'
            })
            offersProcessed++
          }
        })
        
        console.log('🎯 [NETWORK-CAMPAIGNS] Offers processed:', offersProcessed)
        console.log('🎯 [NETWORK-CAMPAIGNS] Available offers:', campaigns.length)
        console.log('📋 [NETWORK-CAMPAIGNS] Campaign names:', campaigns.map(c => c.name))
      }

      // Always add "All Offers" option at the beginning
      if (campaigns.length > 0) {
        campaigns.unshift({
          id: 'all',
          name: 'All Offers',
          campaignId: null
        })
      } else {
        console.log('⚠️ [NETWORK-CAMPAIGNS] No offers found from API')
        campaigns = [{
          id: 'all',
          name: 'All Offers',
          campaignId: null
        }]
      }

      console.log('📤 [NETWORK-CAMPAIGNS] Returning campaigns:', campaigns.length)
      return NextResponse.json({ campaigns })
      
    } catch (apiError) {
      console.error('❌ [NETWORK-CAMPAIGNS] API Error:', apiError)
      return NextResponse.json({ 
        campaigns: [{ id: 'all', name: 'All Campaigns', offerId: null }],
        error: 'Failed to fetch campaigns from network'
      })
    }

  } catch (error) {
    console.error('❌ [NETWORK-CAMPAIGNS] Critical error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}