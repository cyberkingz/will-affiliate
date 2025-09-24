import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, ClickData } from '@/lib/api/affiliate-network'

type ClicksRequestParams = Parameters<AffiliateNetworkAPI['getClicks']>[0]

type ClickTableFilters = {
  offerName?: string
  subId?: string
  subId2?: string
}

interface ClicksApiResponse {
  clicks: ClickData[]
  totalCount: number
  page: number
  limit: number
  hasNextPage: boolean
}

interface RealClicksRequestBody {
  startDate: string
  endDate: string
  networks?: string[]
  campaigns?: string[]
  tableFilters?: ClickTableFilters
  page?: number
  limit?: number
}
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'
import { resolveNetworkAccess } from '@/lib/server/network-access'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as RealClicksRequestBody
    const {
      startDate,
      endDate,
      campaigns = [],
      tableFilters,
      page = 1,
      limit = 50
    } = body
    const networks = body.networks ?? []

    // Check cache first
    const cacheKey = createCacheKey('real-clicks', { 
      userId: user.id, 
      startDate, 
      endDate, 
      networks, 
      campaigns,
      tableFilters,
      page,
      limit
    })
    
    const cachedData = apiCache.get<ClicksApiResponse>(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    const networkAccess = await resolveNetworkAccess(
      supabase,
      user.id,
      networks.length > 0 ? networks : undefined
    )

    if (!networkAccess.success) {
      console.warn('⚠️ [REAL-CLICKS] Network access denied:', networkAccess)
      return NextResponse.json({ error: networkAccess.message }, { status: networkAccess.status })
    }

    const api = new AffiliateNetworkAPI(networkAccess.networkConfig)

    // Prepare API parameters
    const startDateISO = startDate.split('T')[0]
    const endDateISO = endDate.split('T')[0]
    const startAtRow = page > 1 ? (page - 1) * limit + 1 : 1
    
    console.log('📅 [REAL-CLICKS] Date processing:', {
      receivedStartDate: startDate,
      receivedEndDate: endDate,
      processedStartDate: startDateISO,
      processedEndDate: endDateISO,
      startAtRow,
      limit
    })
    
    const apiParams: ClicksRequestParams = {
      start_date: startDateISO,
      end_date: endDateISO,
      include_duplicates: true,
      row_limit: limit,
      start_at_row: startAtRow
    }

    // Add filters - only if specific campaigns selected
    // Empty campaigns array means fetch ALL campaigns
    if (campaigns.length > 0) {
      // Note: Affluent API only supports single campaign_id; use the first selected campaign
      const campaignId = Number(campaigns[0])
      if (Number.isFinite(campaignId)) {
        apiParams.campaign_id = campaignId
      }
      console.log('🎯 [REAL-CLICKS] Filtering for campaign:', campaigns[0])
    } else {
      console.log('📊 [REAL-CLICKS] Fetching ALL campaigns data')
    }

    if (tableFilters?.subId) {
      apiParams.subid_1 = tableFilters.subId === 'empty' ? '' : tableFilters.subId
    }

    // Fetch clicks from affiliate network
    console.log('🌐 [REAL-CLICKS] Calling Affluent API with params:', apiParams)
    const clicksResponse = await api.getClicks(apiParams)

    console.log('📥 [REAL-CLICKS] Affluent API response:', {
      success: clicksResponse.success,
      row_count: clicksResponse.row_count,
      data_length: clicksResponse.data?.length || 0,
      message: clicksResponse.message
    })

    if (!clicksResponse.success) {
      console.error('❌ [REAL-CLICKS] Failed to fetch clicks:', clicksResponse.message)
      return NextResponse.json({ clicks: [], totalCount: 0 })
    }

    // Debug: Log the structure of the first few clicks
    if (clicksResponse.data && clicksResponse.data.length > 0) {
      console.log('🔍 [REAL-CLICKS] First click structure:', JSON.stringify(clicksResponse.data[0], null, 2))
      console.log('🔍 [REAL-CLICKS] Available fields in click object:', Object.keys(clicksResponse.data[0]))
    }

    // Transform API response to match our interface
    const transformedClicks: ClickData[] = clicksResponse.data.map(click => ({
      id: click.unique_click_id || click.tracking_id,
      dateTime: click.click_date,
      offerName: click.offer?.offer_name || click.redirect_from_offer?.offer_name || 'Unknown Offer',
      subId: click.subid_1 || '',
      subId2: click.subid_2 || '',
      campaignId: click.campaign_id ? String(click.campaign_id) : '',
      price: click.price
    }))

    // Debug: Check subId2 values
    const hasSubId2 = transformedClicks.some(click => click.subId2)
    console.log('🔍 [REAL-CLICKS] Sub ID 2 analysis:', {
      totalClicks: transformedClicks.length,
      clicksWithSubId2: transformedClicks.filter(c => c.subId2).length,
      hasSubId2,
      sampleSubId2Values: transformedClicks.slice(0, 5).map(c => c.subId2)
    })

    // Apply client-side filters if needed
    let filteredClicks = transformedClicks
    
    if (tableFilters) {
      if (tableFilters.offerName && tableFilters.offerName !== 'all') {
        const offerNameFilter = tableFilters.offerName.toLowerCase()
        filteredClicks = filteredClicks.filter(click => 
          click.offerName.toLowerCase().includes(offerNameFilter)
        )
      }
      
      if (tableFilters.subId && tableFilters.subId !== 'all') {
        const filterValue = tableFilters.subId === 'empty' ? '' : tableFilters.subId
        filteredClicks = filteredClicks.filter(click => 
          click.subId === filterValue
        )
      }
      
      if (tableFilters.subId2 && tableFilters.subId2 !== 'all') {
        const filterValue = tableFilters.subId2 === 'empty' ? '' : tableFilters.subId2
        filteredClicks = filteredClicks.filter(click => 
          click.subId2 === filterValue
        )
      }
    }

    const responseData: ClicksApiResponse = {
      clicks: filteredClicks,
      totalCount: clicksResponse.row_count, // Use API's total count
      page,
      limit,
      hasNextPage: filteredClicks.length === limit
    }
    
    // Cache the response for 2 minutes
    apiCache.set(cacheKey, responseData, 2)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching real clicks data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
