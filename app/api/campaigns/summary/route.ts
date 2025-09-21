import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'
import { AffiliateNetworkAPI, defaultNetworkConfig } from '@/lib/api/affiliate-network'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, networks, campaigns, subIds } = body

    console.log('📊 [SUMMARY] Request params:', { startDate, endDate, networks, campaigns, subIds })

    // Check cache first
    const cacheKey = createCacheKey('summary', { 
      userId: user.id, 
      startDate, 
      endDate, 
      networks, 
      campaigns, 
      subIds 
    })
    
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      console.log('✅ [SUMMARY] Returning cached data')
      return NextResponse.json(cachedData)
    }

    // Initialize API client
    const api = new AffiliateNetworkAPI(defaultNetworkConfig)

    // Format dates for API
    const apiStartDate = new Date(startDate).toISOString().split('T')[0]
    const apiEndDate = new Date(endDate).toISOString().split('T')[0]

    console.log('🌐 [SUMMARY] Fetching campaign summary from API...')
    
    // Build API parameters
    const apiParams: any = {
      start_date: apiStartDate,
      end_date: apiEndDate
    }

    // Only add campaign filter if specific campaigns selected
    // Empty array means ALL campaigns
    if (campaigns && campaigns.length > 0) {
      // Affluent API doesn't support multiple campaigns in one call
      // We'll need to aggregate data from multiple calls
      console.log('🎯 [SUMMARY] Filtering for specific campaigns:', campaigns)
    }

    // Fetch campaign summary data
    const summaryResponse = await api.getCampaignSummary(apiParams)
    
    console.log('📥 [SUMMARY] API Response:', {
      success: summaryResponse.success,
      dataCount: summaryResponse.data?.length || 0
    })

    // Initialize KPI values
    let totalRevenue = 0
    let totalClicks = 0
    let totalConversions = 0
    let hourlyData: Record<string, { clicks: number; revenue: number }> = {}

    if (summaryResponse.success && summaryResponse.data.length > 0) {
      // Aggregate data from API response
      summaryResponse.data.forEach(row => {
        // If filtering by campaigns, check campaign_id
        if (campaigns && campaigns.length > 0 && !campaigns.includes(row.campaign_id)) {
          return
        }

        totalRevenue += row.revenue || 0
        totalClicks += row.clicks || 0
        totalConversions += row.conversions || 0
      })
    }

    // Try to get hourly data as well
    try {
      const hourlyResponse = await api.getHourlySummary(apiParams)
      
      if (hourlyResponse.success && hourlyResponse.data.length > 0) {
        hourlyResponse.data.forEach(row => {
          const hour = row.hour || '00'
          if (!hourlyData[hour]) {
            hourlyData[hour] = { clicks: 0, revenue: 0 }
          }
          hourlyData[hour].clicks += row.clicks || 0
          hourlyData[hour].revenue += row.revenue || 0
        })
      }
    } catch (error) {
      console.error('⚠️ [SUMMARY] Failed to fetch hourly data:', error)
    }

    // Find peak click hour
    let peakHour = { value: '--', clicks: 0 }
    Object.entries(hourlyData).forEach(([hour, data]) => {
      if (data.clicks > peakHour.clicks) {
        peakHour = { value: `${hour}:00`, clicks: data.clicks }
      }
    })

    // Calculate metrics
    const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const epc = totalClicks > 0 ? totalRevenue / totalClicks : 0

    // Generate hourly trend data
    const trends = []
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0')
      const data = hourlyData[hour] || { clicks: 0, revenue: 0 }
      trends.push({
        hour: `${hour}:00`,
        clicks: data.clicks,
        revenue: data.revenue
      })
    }

    const responseData = {
      kpis: {
        revenue: { value: totalRevenue, change: 0, period: '30d' },
        clicks: { value: totalClicks, change: 0 },
        conversions: { value: totalConversions, change: 0 },
        cvr: { value: cvr, change: 0 },
        epc: { value: epc, change: 0 },
        roas: { value: 0, change: 0 },
        peakHour: peakHour
      },
      trends: trends
    }

    console.log('📤 [SUMMARY] Sending response:', {
      totalClicks,
      totalRevenue,
      totalConversions,
      trendsCount: trends.length
    })
    
    // Cache the response for 2 minutes
    apiCache.set(cacheKey, responseData, 2)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('❌ [SUMMARY] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}