import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig } from '@/lib/api/affiliate-network'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [FILTERS] Starting filters endpoint...')
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [FILTERS] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ [FILTERS] User authenticated:', user.id)

    // Get user's network connections directly
    console.log('📡 [FILTERS] Fetching network connections...')
    const { data: userNetworks } = await supabase
      .from('network_connections')
      .select('id, name, is_active')
      .eq('is_active', true)

    console.log('📊 [FILTERS] Network connections found:', userNetworks?.length || 0)
    console.log('🔗 [FILTERS] Networks data:', JSON.stringify(userNetworks, null, 2))

    // Always use Affluent network as the primary network
    const networks = [
      { id: 'affluent', name: 'Affluent Network' }
    ]
    
    console.log('📡 [FILTERS] Using Affluent as primary network')

    // Fetch campaigns from Affluent offers API
    console.log('🎯 [FILTERS] Starting campaign fetch from Affluent offers API...')
    let uniqueCampaigns = []
    let api
    
    try {
      // Initialize API client with default config
      console.log('🔧 [FILTERS] API Config:', {
        baseUrl: defaultNetworkConfig.baseUrl,
        affiliateId: defaultNetworkConfig.affiliateId,
        hasApiKey: !!defaultNetworkConfig.apiKey,
        apiKey: defaultNetworkConfig.apiKey // Log the actual key to verify
      })
      api = new AffiliateNetworkAPI(defaultNetworkConfig)
      
      console.log('🚀 [FILTERS] Making API call to getOfferFeed...')
      const offersResponse = await api.getOfferFeed()
      
      console.log('📥 [FILTERS] Offers API Response:', {
        success: offersResponse.success,
        dataLength: offersResponse.data?.length || 0,
        message: offersResponse.message,
        hasData: !!offersResponse.data,
        rowCount: offersResponse.row_count
      })
      
      // Log first few offers if any
      if (offersResponse.data && offersResponse.data.length > 0) {
        console.log('📦 [FILTERS] First offer sample:', JSON.stringify(offersResponse.data[0], null, 2))
      }
      
      if (offersResponse.success && offersResponse.data.length > 0) {
        console.log('✅ [FILTERS] Processing offers data for campaigns...')
        
        // Extract campaigns from offers that have campaign_id
        const campaignMap = new Map()
        let offersWithCampaigns = 0
        
        offersResponse.data.forEach(offer => {
          if (offer.campaign_id && offer.offer_name) {
            campaignMap.set(offer.campaign_id, {
              id: offer.campaign_id.toString(),
              name: offer.offer_name
            })
            offersWithCampaigns++
          }
        })
        
        uniqueCampaigns = Array.from(campaignMap.values())
        console.log('🎯 [FILTERS] Found offers with campaigns:', offersWithCampaigns)
        console.log('🎯 [FILTERS] Unique campaigns extracted:', uniqueCampaigns.length)
        console.log('📋 [FILTERS] Sample campaigns:', JSON.stringify(uniqueCampaigns.slice(0, 5), null, 2))
        
        // If no campaigns found in offers, use offer names as campaigns
        if (uniqueCampaigns.length === 0) {
          console.log('🔄 [FILTERS] No campaign IDs found, using offer names as campaigns...')
          const offerMap = new Map()
          offersResponse.data.slice(0, 20).forEach((offer, index) => {
            if (offer.offer_name) {
              offerMap.set(offer.offer_id, {
                id: offer.offer_id.toString(),
                name: offer.offer_name
              })
            }
          })
          uniqueCampaigns = Array.from(offerMap.values())
          console.log('🎯 [FILTERS] Using offers as campaigns:', uniqueCampaigns.length)
        }
      } else {
        console.log('⚠️ [FILTERS] No offers data returned from API')
      }
    } catch (error) {
      console.error('❌ [FILTERS] Failed to fetch offers from API:', error)
      console.error('🔍 [FILTERS] Error details:', {
        message: error.message,
        stack: error.stack
      })
    }

    // If no campaigns found, return empty (will be fetched when network is selected)
    if (uniqueCampaigns.length === 0) {
      console.log('🔄 [FILTERS] No campaigns found - will be loaded when network is selected')
    }

    // Fetch sub IDs from API clicks data  
    console.log('🏷️ [FILTERS] Starting sub IDs fetch from Affluent API...')
    let uniqueSubIds = []
    
    try {
      // Get clicks from a broader date range to find sub IDs
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90) // 90 days back
      
      console.log('🚀 [FILTERS] Making API call to getClicks for sub IDs...')
      const clicksResponse = await api.getClicks({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        row_limit: 1000
      })
      
      console.log('📥 [FILTERS] Clicks API Response:', {
        success: clicksResponse.success,
        dataLength: clicksResponse.data?.length || 0,
        message: clicksResponse.message
      })
      
      if (clicksResponse.success && clicksResponse.data.length > 0) {
        console.log('✅ [FILTERS] Processing clicks data for sub IDs...')
        const subIdSet = new Set()
        clicksResponse.data.forEach(click => {
          if (click.subid_1) subIdSet.add(click.subid_1)
          if (click.subid_2) subIdSet.add(click.subid_2)
        })
        uniqueSubIds = Array.from(subIdSet).filter(Boolean)
        console.log('🏷️ [FILTERS] Found sub IDs:', uniqueSubIds.length)
        console.log('📋 [FILTERS] Sample sub IDs:', uniqueSubIds.slice(0, 10))
      } else {
        console.log('⚠️ [FILTERS] No clicks data returned from API')
      }
    } catch (error) {
      console.error('❌ [FILTERS] Failed to fetch sub IDs from API:', error)
      console.error('🔍 [FILTERS] Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
    
    // If no sub IDs found from API, provide defaults
    if (uniqueSubIds.length === 0) {
      console.log('🔄 [FILTERS] Using default sub IDs')
      uniqueSubIds = ['aug301', 'test123', 'mobile', 'desktop', 'email', 'social']
    }

    const response = {
      networks: networks,
      campaigns: uniqueCampaigns,
      subIds: uniqueSubIds
    }
    
    console.log('📤 [FILTERS] Final response:', {
      networksCount: response.networks.length,
      campaignsCount: response.campaigns.length,
      subIdsCount: response.subIds.length
    })
    console.log('🎯 [FILTERS] Final campaigns:', JSON.stringify(response.campaigns, null, 2))
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [FILTERS] Critical error in filters endpoint:', error)
    console.error('🔍 [FILTERS] Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}