import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig, AffluentClickData } from '@/lib/api/affiliate-network'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, networks, campaigns, tableFilters, page = 1, limit = 50 } = body

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
    
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Get user's network connections
    const { data: userNetworks } = await supabase
      .from('network_connections')
      .select('*')
      .eq('is_active', true)

    if (!userNetworks || userNetworks.length === 0) {
      return NextResponse.json({ clicks: [], totalCount: 0 })
    }

    // Initialize API client
    const networkConfig = {
      ...defaultNetworkConfig,
      affiliateId: userNetworks[0].affiliate_id || defaultNetworkConfig.affiliateId,
      apiKey: userNetworks[0].api_key || defaultNetworkConfig.apiKey,
      baseUrl: defaultNetworkConfig.baseUrl // Use default config for now
    }
    
    const api = new AffiliateNetworkAPI(networkConfig)

    // Prepare API parameters
    const apiParams: any = {
      start_date: startDate.split('T')[0],
      end_date: endDate.split('T')[0],
      limit,
      page
    }

    // Add filters - only if specific campaigns selected
    // Empty campaigns array means fetch ALL campaigns
    if (campaigns && campaigns.length > 0) {
      // Note: Affluent API only supports single campaign_id
      // For multiple campaigns, we'd need multiple API calls
      apiParams.campaign_id = campaigns[0]
      console.log('🎯 [REAL-CLICKS] Filtering for campaign:', campaigns[0])
    } else {
      console.log('📊 [REAL-CLICKS] Fetching ALL campaigns data')
    }

    if (tableFilters?.subId) {
      apiParams.subid_1 = tableFilters.subId === 'empty' ? '' : tableFilters.subId
    }

    // Fetch clicks from affiliate network
    const clicksResponse = await api.getClicks(apiParams)

    if (!clicksResponse.success) {
      console.error('Failed to fetch clicks:', clicksResponse.message)
      return NextResponse.json({ clicks: [], totalCount: 0 })
    }

    // Transform API response to match our interface
    const transformedClicks = clicksResponse.data.map(click => ({
      id: click.unique_click_id || click.tracking_id,
      dateTime: click.click_date,
      offerName: click.offer?.offer_name || click.redirect_from_offer?.offer_name || 'Unknown Offer',
      subId: click.subid_1 || '',
      subId2: click.subid_2 || ''
    }))

    // Apply client-side filters if needed
    let filteredClicks = transformedClicks
    
    if (tableFilters) {
      if (tableFilters.offerName && tableFilters.offerName !== 'all') {
        filteredClicks = filteredClicks.filter(click => 
          click.offerName.toLowerCase().includes(tableFilters.offerName.toLowerCase())
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

    const responseData = {
      clicks: filteredClicks,
      totalCount: filteredClicks.length, // In a real implementation, this should come from the API
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