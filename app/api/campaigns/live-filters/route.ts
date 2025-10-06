import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI } from '@/lib/api/affiliate-network'
import { resolveNetworkAccess } from '@/lib/server/network-access'
import { persistentCache, createCacheKey } from '@/lib/cache/persistent-api-cache'

interface LiveFiltersResponse {
  networks: Array<{ id: string; name: string; status?: string }>
  campaigns: Array<{ id: string; name: string }>
  subIds: string[]
  subIds1: string[]
  subIds2: string[]
  offerNames: string[]
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [LIVE-FILTERS] Starting live filters extraction...')
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [LIVE-FILTERS] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, networks = [] } = body

    console.log('📅 [LIVE-FILTERS] Date range:', { startDate, endDate })

    // Check cache first (5 minute TTL for filter data)
    const cacheKey = createCacheKey('live-filters', { 
      userId: user.id, 
      startDate, 
      endDate, 
      networks 
    })
    
    const cachedData = persistentCache.get<LiveFiltersResponse>(cacheKey)
    if (cachedData) {
      console.log('📋 [LIVE-FILTERS] Returning cached filter data')
      return NextResponse.json(cachedData)
    }

    console.log('🔍 [LIVE-FILTERS] Resolving network access...')
    const networkAccess = await resolveNetworkAccess(
      supabase,
      user.id,
      networks.length > 0 ? networks : undefined
    )

    if (!networkAccess.success) {
      console.warn('⚠️ [LIVE-FILTERS] Network access failed:', networkAccess.message)
      return NextResponse.json({
        networks: [],
        campaigns: [],
        subIds: [],
        subIds1: [],
        subIds2: [],
        offerNames: [],
        error: networkAccess.message
      })
    }

    const availableNetworks = networkAccess.accessibleNetworks.map(network => ({
      id: network.id,
      name: network.name,
      status: network.is_active ? 'active' : 'inactive'
    }))

    // If no networks accessible, return empty filters
    if (availableNetworks.length === 0) {
      const emptyResponse: LiveFiltersResponse = {
        networks: [],
        campaigns: [],
        subIds: [],
        subIds1: [],
        subIds2: [],
        offerNames: []
      }
      return NextResponse.json(emptyResponse)
    }

    const api = new AffiliateNetworkAPI(networkAccess.networkConfig)

    // Process dates for API with time ranges for single day selections
    const startDateOnly = startDate.split('T')[0]
    const endDateOnly = endDate.split('T')[0]
    const startDateISO = startDateOnly === endDateOnly ? `${startDateOnly} 00:00:00` : startDateOnly
    const endDateISO = startDateOnly === endDateOnly ? `${endDateOnly} 23:59:59` : endDateOnly

    console.log('🌐 [LIVE-FILTERS] Fetching live data for filter extraction...')

    // OPTIMIZATION: Reduced sample size for filter extraction
    // We only need a small sample to get unique offer names and subIds
    const [clicksResponse, conversionsResponse] = await Promise.all([
      api.getClicks({
        start_date: startDateISO,
        end_date: endDateISO,
        include_duplicates: true,
        row_limit: 50, // Small sample sufficient for filter options
        start_at_row: 1
      }),
      api.getConversions({
        start_date: startDateISO,
        end_date: endDateISO,
        limit: 50, // Small sample sufficient for filter options
        start_at_row: 1
      })
    ])

    console.log('📥 [LIVE-FILTERS] Responses received:', {
      clicks: {
        success: clicksResponse.success,
        data_length: clicksResponse.data?.length || 0
      },
      conversions: {
        success: conversionsResponse.success,
        data_length: conversionsResponse.data?.length || 0
      }
    })

    // Extract unique values from the live data
    const subIdSet = new Set<string>()
    const subId2Set = new Set<string>()
    const offerNameSet = new Set<string>()
    const campaignSet = new Map<string, string>() // id -> name

    // Process clicks data
    if (clicksResponse.success && clicksResponse.data) {
      for (const click of clicksResponse.data) {
        // Extract Sub IDs
        if (click.subid_1) {
          subIdSet.add(String(click.subid_1).trim())
        }
        if (click.subid_2) {
          subId2Set.add(String(click.subid_2).trim())
        }
        
        // Extract offer names
        const offerName = click.offer?.offer_name || click.redirect_from_offer?.offer_name
        if (offerName && typeof offerName === 'string') {
          offerNameSet.add(offerName.trim())
        }

        // Extract campaign info
        if (click.campaign_id) {
          const campaignId = String(click.campaign_id)
          const campaignName = offerName || `Campaign ${campaignId}`
          campaignSet.set(campaignId, campaignName)
        }
      }
    }

    // Process conversions data
    if (conversionsResponse.success && conversionsResponse.data) {
      for (const conversion of conversionsResponse.data) {
        // Extract Sub IDs
        if (conversion.subid_1) {
          subIdSet.add(String(conversion.subid_1).trim())
        }
        if (conversion.subid_2) {
          subId2Set.add(String(conversion.subid_2).trim())
        }
        
        // Extract offer names
        if (conversion.offer_name && typeof conversion.offer_name === 'string') {
          offerNameSet.add(conversion.offer_name.trim())
        }

        // Extract campaign info
        if (conversion.campaign_id) {
          const campaignId = String(conversion.campaign_id)
          const campaignName = conversion.offer_name || `Campaign ${campaignId}`
          campaignSet.set(campaignId, campaignName)
        }
      }
    }

    // Convert to sorted arrays
    const subIds = Array.from(subIdSet).filter(Boolean).sort()
    const subIds2 = Array.from(subId2Set).filter(Boolean).sort()
    const offerNames = Array.from(offerNameSet).filter(Boolean).sort()
    const campaigns = Array.from(campaignSet.entries()).map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const response: LiveFiltersResponse = {
      networks: availableNetworks,
      campaigns,
      subIds,
      subIds1: subIds, // Same as subIds for backwards compatibility
      subIds2,
      offerNames
    }

    console.log('📤 [LIVE-FILTERS] Final response:', {
      networksCount: response.networks.length,
      campaignsCount: response.campaigns.length,
      subIdsCount: response.subIds.length,
      subIds2Count: response.subIds2.length,
      offerNamesCount: response.offerNames.length,
      sampleSubIds: response.subIds.slice(0, 5),
      sampleSubIds2: response.subIds2.slice(0, 5),
      sampleOfferNames: response.offerNames.slice(0, 3)
    })

    // Cache the response for 15 minutes (filter options don't change frequently)
    persistentCache.set(cacheKey, response, 15)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [LIVE-FILTERS] Critical error in live filters endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}