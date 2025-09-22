import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig, AffluentConversionData } from '@/lib/api/affiliate-network'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'

type ConversionsRequestParams = Parameters<AffiliateNetworkAPI['getConversions']>[0]

type ConversionTableFilters = {
  offerName?: string
  subId?: string
  subId2?: string
}

interface ConversionRow {
  id: string
  dateTime: string
  offerName: string
  subId: string
  subId2: string
  price: number
}

interface ConversionsApiResponse {
  conversions: ConversionRow[]
  totalCount: number
  page: number
  limit: number
  hasNextPage: boolean
}

interface RealConversionsRequestBody {
  startDate: string
  endDate: string
  campaigns?: string[]
  tableFilters?: ConversionTableFilters
  page?: number
  limit?: number
  networks?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as RealConversionsRequestBody
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
    const cacheKey = createCacheKey('real-conversions', { 
      userId: user.id, 
      startDate, 
      endDate, 
      networks, 
      campaigns,
      tableFilters,
      page,
      limit
    })
    
    const cachedData = apiCache.get<ConversionsApiResponse>(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Get user's network connections
    const { data: userNetworks, error: networkError } = await supabase
      .from('network_connections')
      .select('*')
      .eq('is_active', true)

    console.log('🔍 [REAL-CONVERSIONS] Network connections query result:', {
      userNetworks,
      networkError,
      count: userNetworks?.length || 0
    })

    if (!userNetworks || userNetworks.length === 0) {
      console.log('⚠️ [REAL-CONVERSIONS] No active network connections found, using default Affluent config')
      // Use default Affluent configuration if no network connections
    }

    // Initialize API client - use default config if no network connections
    const networkConfig = userNetworks && userNetworks.length > 0 ? {
      ...defaultNetworkConfig,
      affiliateId: userNetworks[0].affiliate_id || defaultNetworkConfig.affiliateId,
      apiKey: userNetworks[0].api_key || defaultNetworkConfig.apiKey,
      baseUrl: defaultNetworkConfig.baseUrl
    } : defaultNetworkConfig
    
    const api = new AffiliateNetworkAPI(networkConfig)

    // Prepare API parameters
    const startDateISO = startDate.split('T')[0]
    const endDateISO = endDate.split('T')[0]
    const startAtRow = page > 1 ? (page - 1) * limit + 1 : 1
    
    console.log('📅 [REAL-CONVERSIONS] Date processing:', {
      receivedStartDate: startDate,
      receivedEndDate: endDate,
      processedStartDate: startDateISO,
      processedEndDate: endDateISO,
      startAtRow,
      limit
    })
    
    const apiParams: ConversionsRequestParams = {
      start_date: startDateISO,
      end_date: endDateISO,
      limit,
      start_at_row: startAtRow
    }

    // Add filters - fix parameter names for Affluent API
    if (campaigns.length > 0) {
      const campaignId = Number(campaigns[0])
      if (Number.isFinite(campaignId)) {
        apiParams.campaign_id = campaignId
      }
      console.log('🎯 [REAL-CONVERSIONS] Filtering for campaign:', campaigns[0])
    } else {
      console.log('📊 [REAL-CONVERSIONS] Fetching ALL campaigns data')
    }

    if (tableFilters?.subId) {
      apiParams.subid_1 = tableFilters.subId === 'empty' ? '' : tableFilters.subId
    }

    // Fetch conversions from affiliate network
    console.log('🌐 [REAL-CONVERSIONS] Calling Affluent API with params:', apiParams)
    const conversionsResponse = await api.getConversions(apiParams)

    console.log('📥 [REAL-CONVERSIONS] Affluent API response:', {
      success: conversionsResponse.success,
      row_count: conversionsResponse.row_count,
      data_length: conversionsResponse.data?.length || 0,
      message: conversionsResponse.message
    })

    if (!conversionsResponse.success) {
      console.error('❌ [REAL-CONVERSIONS] Failed to fetch conversions:', conversionsResponse.message)
      return NextResponse.json({ conversions: [], totalCount: 0 })
    }

    // Transform API response to match our interface
    const transformedConversions: ConversionRow[] = conversionsResponse.data.map(conversion => ({
      id: conversion.conversion_id,
      dateTime: conversion.conversion_date, // Affluent uses "conversion_date"
      offerName: conversion.offer_name || 'Unknown Offer',
      subId: conversion.subid_1 || '', // Affluent uses "subid_1"
      subId2: conversion.subid_2 || '', // Affluent uses "subid_2"
      price: conversion.price || 0 // Affluent uses "price"
    }))

    // Apply client-side filters if needed
    let filteredConversions = transformedConversions
    
    if (tableFilters) {
      if (tableFilters.offerName && tableFilters.offerName !== 'all') {
        const offerNameFilter = tableFilters.offerName.toLowerCase()
        filteredConversions = filteredConversions.filter(conversion => 
          conversion.offerName.toLowerCase().includes(offerNameFilter)
        )
      }
      
      if (tableFilters.subId && tableFilters.subId !== 'all') {
        const filterValue = tableFilters.subId === 'empty' ? '' : tableFilters.subId
        filteredConversions = filteredConversions.filter(conversion => 
          conversion.subId === filterValue
        )
      }
      
      if (tableFilters.subId2 && tableFilters.subId2 !== 'all') {
        const filterValue = tableFilters.subId2 === 'empty' ? '' : tableFilters.subId2
        filteredConversions = filteredConversions.filter(conversion => 
          conversion.subId2 === filterValue
        )
      }
    }

    const responseData: ConversionsApiResponse = {
      conversions: filteredConversions,
      totalCount: conversionsResponse.row_count, // Use API's total count
      page,
      limit,
      hasNextPage: filteredConversions.length === limit
    }
    
    // Cache the response for 2 minutes
    apiCache.set(cacheKey, responseData, 2)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching real conversions data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
