import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, defaultNetworkConfig } from '@/lib/api/affiliate-network'
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
    
    const cachedData = apiCache.get(cacheKey)
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
      baseUrl: userNetworks[0].api_url || defaultNetworkConfig.baseUrl
    }
    
    const api = new AffiliateNetworkAPI(networkConfig)

    // Prepare API parameters
    const apiParams: any = {
      start_date: startDate.split('T')[0],
      end_date: endDate.split('T')[0],
      limit,
      page
    }

    // Add filters
    if (campaigns && campaigns.length > 0) {
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
    const transformedConversions = conversionsResponse.data.map(conversion => ({
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
        filteredConversions = filteredConversions.filter(conversion => 
          conversion.offerName.toLowerCase().includes(tableFilters.offerName.toLowerCase())
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

    const responseData = {
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