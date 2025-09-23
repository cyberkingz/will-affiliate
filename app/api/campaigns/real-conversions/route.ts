import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffiliateNetworkAPI, AffluentConversionData } from '@/lib/api/affiliate-network'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'
import { resolveNetworkAccess } from '@/lib/server/network-access'

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

    const networkAccess = await resolveNetworkAccess(
      supabase,
      user.id,
      networks.length > 0 ? networks : undefined
    )

    if (!networkAccess.success) {
      console.warn('⚠️ [REAL-CONVERSIONS] Network access denied:', networkAccess)
      return NextResponse.json({ error: networkAccess.message }, { status: networkAccess.status })
    }

    const api = new AffiliateNetworkAPI(networkAccess.networkConfig)

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

    // Debug: Log the structure of the first few conversions
    if (conversionsResponse.data && conversionsResponse.data.length > 0) {
      console.log('🔍 [REAL-CONVERSIONS] First conversion structure:', JSON.stringify(conversionsResponse.data[0], null, 2))
      console.log('🔍 [REAL-CONVERSIONS] Available fields in conversion object:', Object.keys(conversionsResponse.data[0]))
      
      // 🎯 AUDIT: Check for revenue-related fields
      const revenueFields = ['revenue', 'payout', 'commission', 'sale_amount', 'earning', 'amount']
      const conversionObj = conversionsResponse.data[0] as any
      
      console.log('💰 [REAL-CONVERSIONS] REVENUE FIELD AUDIT:', revenueFields.map(field => ({
        field,
        value: conversionObj[field],
        type: typeof conversionObj[field],
        present: field in conversionObj
      })))
      
      // 🎯 AUDIT: Check for status fields
      const statusFields = ['status', 'conversion_status', 'disposition', 'state', 'approved']
      console.log('📊 [REAL-CONVERSIONS] STATUS FIELD AUDIT:', statusFields.map(field => ({
        field,
        value: conversionObj[field],
        type: typeof conversionObj[field],
        present: field in conversionObj
      })))
      
      // 🎯 AUDIT: Check for attribution fields
      const attributionFields = ['click_id', 'session_id', 'campaign_id', 'advertiser_id']
      console.log('🔗 [REAL-CONVERSIONS] ATTRIBUTION FIELD AUDIT:', attributionFields.map(field => ({
        field,
        value: conversionObj[field],
        type: typeof conversionObj[field],
        present: field in conversionObj
      })))
      
      // 🎯 AUDIT: Check all fields with numeric values > 0
      const numericFields = Object.entries(conversionObj)
        .filter(([key, value]) => typeof value === 'number' && value > 0)
        .map(([key, value]) => ({ field: key, value }))
      console.log('🔢 [REAL-CONVERSIONS] NON-ZERO NUMERIC FIELDS:', numericFields)
    }

    // Transform API response to match our interface
    const transformedConversions: ConversionRow[] = conversionsResponse.data.map(conversion => {
      // 🎯 IMPROVED: Smart revenue detection with fallback hierarchy
      const conversionAny = conversion as any
      const actualRevenue = 
        conversionAny.revenue ||           // Primary: conversion revenue
        conversionAny.payout ||            // Secondary: affiliate payout
        conversionAny.commission ||        // Tertiary: commission amount
        conversionAny.earning ||           // Alternative: earning amount
        conversionAny.amount ||            // Generic: amount field
        conversionAny.sale_amount ||       // RevShare: total sale amount
        conversion.price ||                // Fallback: offer price (CPA)
        0
      
      console.log(`💰 [REAL-CONVERSIONS] Conversion ${conversion.conversion_id} revenue calculation:`, {
        originalPrice: conversion.price,
        detectedRevenue: actualRevenue,
        sources: {
          revenue: conversionAny.revenue,
          payout: conversionAny.payout,
          commission: conversionAny.commission,
          earning: conversionAny.earning,
          amount: conversionAny.amount,
          sale_amount: conversionAny.sale_amount
        }
      })
      
      return {
        id: conversion.conversion_id,
        date: conversion.conversion_date, // Keep the full ISO date string
        time: conversion.conversion_date, // Same for time - will be parsed in component
        offerName: conversion.offer_name || 'Unknown Offer',
        subId: conversion.subid_1 || '', // Affluent uses "subid_1"
        subId2: conversion.subid_2 || '', // Affluent uses "subid_2"
        campaignId: conversion.campaign_id ? String(conversion.campaign_id) : '',
        price: actualRevenue // 🎯 Use smart revenue detection
      }
    })

    // Debug: Check subId2 values
    const hasSubId2 = transformedConversions.some(conv => conv.subId2)
    console.log('🔍 [REAL-CONVERSIONS] Sub ID 2 analysis:', {
      totalConversions: transformedConversions.length,
      conversionsWithSubId2: transformedConversions.filter(c => c.subId2).length,
      hasSubId2,
      sampleSubId2Values: transformedConversions.slice(0, 5).map(c => c.subId2)
    })

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
