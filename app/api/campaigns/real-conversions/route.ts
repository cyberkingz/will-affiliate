import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig } from '@/lib/api/affiliate-network'
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
    const { data: userNetworks } = await supabase
      .from('network_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!userNetworks || userNetworks.length === 0) {
      return NextResponse.json({ conversions: [], totalCount: 0 })
    }

    // Initialize API client
    const networkConfig = {
      ...defaultNetworkConfig,
      affiliateId: userNetworks[0].affiliate_id || defaultNetworkConfig.affiliateId,
      apiKey: userNetworks[0].api_key || defaultNetworkConfig.apiKey,
      baseUrl: defaultNetworkConfig.baseUrl
    }
    
    const api = new AffiliateNetworkAPI(networkConfig)

    // Prepare API parameters
    const startDateISO = startDate.split('T')[0]
    const endDateISO = endDate.split('T')[0]
    const apiParams: ConversionsRequestParams = {
      start_date: startDateISO,
      end_date: endDateISO,
      limit,
      page
    }

    // Add filters
    if (campaigns.length > 0) {
      apiParams.campaign_id = campaigns[0]
    }

    if (tableFilters?.subId) {
      apiParams.sub_id = tableFilters.subId === 'empty' ? '' : tableFilters.subId
    }

    // Fetch conversions from affiliate network
    const conversionsResponse = await api.getConversions(apiParams)

    if (!conversionsResponse.success) {
      console.error('Failed to fetch conversions:', conversionsResponse.message)
      return NextResponse.json({ conversions: [], totalCount: 0 })
    }

    // Transform API response to match our interface
    const transformedConversions: ConversionRow[] = conversionsResponse.data.map(conversion => ({
      id: conversion.conversion_id || conversion.transaction_id,
      dateTime: conversion.datetime,
      offerName: conversion.offer_name || 'Unknown Offer',
      subId: conversion.sub_id || '',
      subId2: conversion.sub_id_2 || '',
      price: conversion.revenue || conversion.payout || 0
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
      totalCount: filteredConversions.length,
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
