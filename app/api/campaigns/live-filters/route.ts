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

    // Check cache first (2 minute TTL for filter data - shorter for fresher data)
    const cacheKey = createCacheKey('live-filters', {
      userId: user.id,
      startDate,
      endDate,
      networks
    })

    const cachedData = persistentCache.get<LiveFiltersResponse>(cacheKey)
    if (cachedData) {
      console.log('📋 [LIVE-FILTERS] Returning cached filter data:', {
        subIds: cachedData.subIds?.length || 0,
        subIds2: cachedData.subIds2?.length || 0,
        offerNames: cachedData.offerNames?.length || 0
      })
      return NextResponse.json(cachedData)
    }

    console.log('🔄 [LIVE-FILTERS] Cache miss - fetching fresh data')

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

    // STRATEGY: Sequential sampling for complete Sub ID coverage
    // ISSUE FIX: Previous gap-based sampling (rows 1-200, 501-700, 1001-1200) missed Sub IDs in gaps
    // SOLUTION: Fetch first 600 conversions sequentially (rows 1-200, 201-400, 401-600)
    const [clicksResponse, conv1, conv2, conv3] = await Promise.all([
      api.getClicks({
        start_date: startDateISO,
        end_date: endDateISO,
        include_duplicates: true,
        row_limit: 100,
        start_at_row: 1
      }),
      // Batch 1: First 200 conversions (rows 1-200)
      api.getConversions({
        start_date: startDateISO,
        end_date: endDateISO,
        limit: 200,
        start_at_row: 1
      }),
      // Batch 2: Next 200 conversions (rows 201-400) - NO GAP
      api.getConversions({
        start_date: startDateISO,
        end_date: endDateISO,
        limit: 200,
        start_at_row: 201
      }),
      // Batch 3: Next 200 conversions (rows 401-600) - NO GAP
      api.getConversions({
        start_date: startDateISO,
        end_date: endDateISO,
        limit: 200,
        start_at_row: 401
      })
    ])

    // Merge all conversion responses - use partial data even if some batches fail
    const successfulBatches = [conv1, conv2, conv3].filter(batch => batch.success)
    const failedBatches = [conv1, conv2, conv3].filter(batch => !batch.success)

    const conversionsResponse = {
      success: successfulBatches.length > 0, // Success if at least one batch succeeded
      data: [
        ...(conv1.data || []),
        ...(conv2.data || []),
        ...(conv3.data || [])
      ],
      row_count: conv1.row_count || 0,
      message: failedBatches.length > 0
        ? `⚠️ ${failedBatches.length}/${3} batches failed, using ${successfulBatches.length} successful batches`
        : conv1.message,
      partialData: failedBatches.length > 0
    }

    console.log('📥 [LIVE-FILTERS] Responses received:', {
      clicks: {
        success: clicksResponse.success,
        data_length: clicksResponse.data?.length || 0
      },
      conversions: {
        success: conversionsResponse.success,
        total_data_length: conversionsResponse.data?.length || 0,
        batch1_success: conv1.success,
        batch1_length: conv1.data?.length || 0,
        batch2_success: conv2.success,
        batch2_length: conv2.data?.length || 0,
        batch3_success: conv3.success,
        batch3_length: conv3.data?.length || 0,
        successful_batches: successfulBatches.length,
        failed_batches: failedBatches.length,
        sampling_strategy: 'SEQUENTIAL: rows 1-200, 201-400, 401-600 (NO GAPS)',
        partial_data: conversionsResponse.partialData
      }
    })

    if (failedBatches.length > 0) {
      console.warn(`⚠️ [LIVE-FILTERS] Using partial data - ${failedBatches.length} batch(es) failed but continuing with ${successfulBatches.length} successful batch(es)`)
    }

    // DEBUG: Sub ID 2 extraction details
    const batch1SubIds2 = new Set(conv1.data?.map(c => c.subid_2).filter(Boolean) || [])
    const batch2SubIds2 = new Set(conv2.data?.map(c => c.subid_2).filter(Boolean) || [])
    const batch3SubIds2 = new Set(conv3.data?.map(c => c.subid_2).filter(Boolean) || [])
    const clicksSubIds2 = new Set(clicksResponse.data?.map(c => c.subid_2).filter(Boolean) || [])

    console.log('🔍 [DEBUG] Sub ID 2 by source:', {
      batch1_count: batch1SubIds2.size,
      batch1_values: Array.from(batch1SubIds2).sort(),
      batch2_count: batch2SubIds2.size,
      batch2_values: Array.from(batch2SubIds2).sort(),
      batch3_count: batch3SubIds2.size,
      batch3_values: Array.from(batch3SubIds2).sort(),
      clicks_count: clicksSubIds2.size,
      clicks_values: Array.from(clicksSubIds2).sort()
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

    // Cache the response for 2 minutes (balance between performance and data freshness)
    // Shorter TTL ensures new Sub IDs appear quickly
    persistentCache.set(cacheKey, response, 2)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [LIVE-FILTERS] Critical error in live filters endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}