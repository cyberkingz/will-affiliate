import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig, AffluentRecord } from '@/lib/api/affiliate-network'

const toIdString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString()
  }
  return null
}

const getRecordString = (record: AffluentRecord, key: string): string | null => {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const normalizeError = (error: unknown): Error => {
  return error instanceof Error ? error : new Error(String(error))
}

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
    let uniqueCampaigns: Array<{ id: string; name: string }> = []
    let api: AffiliateNetworkAPI | null = null
    
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
        
        offersResponse.data.forEach((offerRecord: AffluentRecord) => {
          const campaignId = toIdString(offerRecord['campaign_id'])
          const offerName = getRecordString(offerRecord, 'offer_name')
          if (campaignId && offerName) {
            campaignMap.set(campaignId, {
              id: campaignId,
              name: offerName
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
          offersResponse.data.slice(0, 20).forEach((offerRecord: AffluentRecord) => {
            const offerId = toIdString(offerRecord['offer_id'])
            const offerName = getRecordString(offerRecord, 'offer_name')
            if (offerId && offerName) {
              offerMap.set(offerId, {
                id: offerId,
                name: offerName
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
      const apiError = normalizeError(error)
      console.error('❌ [FILTERS] Failed to fetch offers from API:', apiError)
      console.error('🔍 [FILTERS] Error details:', {
        message: apiError.message,
        stack: apiError.stack
      })
    }

    // If no campaigns found, return empty (will be fetched when network is selected)
    if (uniqueCampaigns.length === 0) {
      console.log('🔄 [FILTERS] No campaigns found - will be loaded when network is selected')
    }

    // Fetch sub IDs from API clicks data  
    console.log('🏷️ [FILTERS] Starting sub IDs fetch from Affluent API...')
    let uniqueSubIds: string[] = []
    
    try {
      // Get clicks from current month to find sub IDs (month-to-date)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(1) // First day of current month
      
      console.log('🚀 [FILTERS] Making API call to getClicks for sub IDs...')
      if (!api) {
        console.warn('⚠️ [FILTERS] API client not initialized, skipping sub ID fetch')
        uniqueSubIds = []
      } else {
        const clicksResponse = await api.getClicks({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          row_limit: 10000
        })

        console.log('📥 [FILTERS] Clicks API Response:', {
          success: clicksResponse.success,
          dataLength: clicksResponse.data?.length || 0,
          message: clicksResponse.message
        })

        if (clicksResponse.success && clicksResponse.data.length > 0) {
          console.log('✅ [FILTERS] Processing clicks data for sub IDs...')
          console.log('📊 [FILTERS] Total clicks to process:', clicksResponse.data.length)

          const subIdSet = new Set<string>()
          let subId1Count = 0, subId2Count = 0, subId3Count = 0, subId4Count = 0, subId5Count = 0

          clicksResponse.data.forEach(click => {
            if (click.subid_1) { subIdSet.add(click.subid_1); subId1Count++ }
            if (click.subid_2) { subIdSet.add(click.subid_2); subId2Count++ }
            if (click.subid_3) { subIdSet.add(click.subid_3); subId3Count++ }
            if (click.subid_4) { subIdSet.add(click.subid_4); subId4Count++ }
            if (click.subid_5) { subIdSet.add(click.subid_5); subId5Count++ }
          })

          uniqueSubIds = Array.from(subIdSet).filter(Boolean) as string[]
          console.log('🏷️ [FILTERS] Sub ID statistics:', {
            subid_1_clicks: subId1Count,
            subid_2_clicks: subId2Count,
            subid_3_clicks: subId3Count,
            subid_4_clicks: subId4Count,
            subid_5_clicks: subId5Count,
            unique_subids: uniqueSubIds.length
          })
          console.log('📋 [FILTERS] All unique sub IDs found:', uniqueSubIds)
        } else {
          console.log('⚠️ [FILTERS] No clicks data returned from API')
        }
      }
    } catch (error) {
      const apiError = normalizeError(error)
      console.error('❌ [FILTERS] Failed to fetch sub IDs from API:', apiError)
      console.error('🔍 [FILTERS] Error details:', {
        message: apiError.message,
        stack: apiError.stack
      })
    }
    
    // Only use real sub IDs from API data - no fallbacks
    if (uniqueSubIds.length === 0) {
      console.log('🔄 [FILTERS] No clicks found in API - returning empty sub IDs (real data only)')
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
    const apiError = normalizeError(error)
    console.error('❌ [FILTERS] Critical error in filters endpoint:', apiError)
    console.error('🔍 [FILTERS] Error stack:', apiError.stack)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
