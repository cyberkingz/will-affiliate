import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'
import { AffiliateNetworkAPI, defaultNetworkConfig, AffluentClickData } from '@/lib/api/affiliate-network'

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

    console.log('🌐 [SUMMARY] Fetching real performance data from Affluent API...')
    
    // Initialize tracking variables
    let totalRevenue = 0
    let totalClicks = 0
    let totalConversions = 0
    let hourlyData: Record<string, { clicks: number; revenue: number }> = {}

    // Step 1: Fetch Performance Summary for overall KPIs
    console.log('📈 [SUMMARY] Fetching performance summary...')
    try {
      const performanceSummary = await api.getPerformanceSummary({
        date: apiStartDate // Use start date for the summary
      })

      if (performanceSummary.success && performanceSummary.data.length > 0) {
        const summary = performanceSummary.data[0]
        console.log('✅ [SUMMARY] Performance summary data:', summary)
        
        // Extract overall metrics from performance summary
        totalRevenue = summary.revenue || summary.total_revenue || 0
        totalClicks = summary.clicks || summary.total_clicks || 0
        totalConversions = summary.conversions || summary.total_conversions || 0
      }
    } catch (error) {
      console.warn('⚠️ [SUMMARY] Performance summary failed, continuing with clicks data:', error.message)
    }

    // Step 2: Fetch detailed clicks data for hourly breakdown
    console.log('🖱️ [SUMMARY] Fetching clicks data for hourly breakdown...')
    let allClicks: AffluentClickData[] = []
    let currentRow = 1
    const batchSize = 1000 // Fetch in batches to handle large datasets

    try {
      while (true) {
        const clicksResponse = await api.getClicks({
          start_date: apiStartDate,
          end_date: apiEndDate,
          start_at_row: currentRow,
          row_limit: batchSize,
          include_duplicates: false // Exclude duplicates for accurate counts
        })

        if (!clicksResponse.success || !clicksResponse.data || clicksResponse.data.length === 0) {
          break
        }

        console.log(`📊 [SUMMARY] Fetched ${clicksResponse.data.length} clicks (batch starting at row ${currentRow})`)
        
        // Filter by campaigns if specified
        let filteredClicks = clicksResponse.data
        if (campaigns && campaigns.length > 0) {
          filteredClicks = clicksResponse.data.filter(click => 
            campaigns.includes(click.campaign_id?.toString())
          )
        }

        // Filter by subIds if specified
        if (subIds && subIds.length > 0) {
          filteredClicks = filteredClicks.filter(click => 
            subIds.includes(click.subid_1) || 
            subIds.includes(click.subid_2) ||
            subIds.includes(click.subid_3) ||
            subIds.includes(click.subid_4) ||
            subIds.includes(click.subid_5)
          )
        }

        allClicks.push(...filteredClicks)
        
        // If we didn't get a full batch, we've reached the end
        if (clicksResponse.data.length < batchSize) {
          break
        }
        
        currentRow += batchSize
        
        // Safety limit to prevent infinite loops
        if (currentRow > 100000) {
          console.warn('⚠️ [SUMMARY] Reached safety limit for clicks fetching')
          break
        }
      }

      console.log(`✅ [SUMMARY] Total clicks fetched: ${allClicks.length}`)

      // If we didn't get performance summary data, calculate from clicks
      if (totalClicks === 0 && allClicks.length > 0) {
        totalClicks = allClicks.length
        totalRevenue = allClicks.reduce((sum, click) => sum + (click.price || 0), 0)
      }

      // Process clicks data for hourly breakdown
      allClicks.forEach(click => {
        const clickDate = new Date(click.click_date)
        const hour = clickDate.getHours().toString().padStart(2, '0')
        
        if (!hourlyData[hour]) {
          hourlyData[hour] = { clicks: 0, revenue: 0 }
        }
        
        hourlyData[hour].clicks += 1
        hourlyData[hour].revenue += click.price || 0
      })

    } catch (error) {
      console.error('❌ [SUMMARY] Error fetching clicks data:', error)
    }

    // Step 3: Try to fetch conversions data (if available)
    console.log('💰 [SUMMARY] Attempting to fetch conversions data...')
    try {
      const conversionsResponse = await api.getConversions({
        start_date: apiStartDate,
        end_date: apiEndDate
      })

      if (conversionsResponse.success && conversionsResponse.data) {
        let filteredConversions = conversionsResponse.data
        
        // Filter by campaigns if specified
        if (campaigns && campaigns.length > 0) {
          filteredConversions = conversionsResponse.data.filter(conv => 
            campaigns.includes(conv.campaign_id?.toString())
          )
        }

        // Filter by subIds if specified
        if (subIds && subIds.length > 0) {
          filteredConversions = filteredConversions.filter(conv => 
            subIds.includes(conv.sub_id) || 
            subIds.includes(conv.sub_id_2) ||
            subIds.includes(conv.sub_id_3) ||
            subIds.includes(conv.sub_id_4) ||
            subIds.includes(conv.sub_id_5)
          )
        }

        totalConversions = filteredConversions.length
        
        // If we didn't get revenue from performance summary or clicks, use conversions
        if (totalRevenue === 0) {
          totalRevenue = filteredConversions.reduce((sum, conv) => sum + (conv.revenue || conv.payout || 0), 0)
        }

        console.log(`✅ [SUMMARY] Conversions found: ${totalConversions}, Additional revenue: ${totalRevenue}`)
      }
    } catch (error) {
      console.warn('⚠️ [SUMMARY] Conversions data not available:', error.message)
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
    const roas = totalRevenue > 0 ? (totalRevenue / Math.max(totalRevenue * 0.1, 1)) : 0 // Assuming 10% cost

    // Generate hourly trend data (fill missing hours with 0)
    const trends = []
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0')
      const data = hourlyData[hour] || { clicks: 0, revenue: 0 }
      trends.push({
        hour: `${hour}:00`,
        clicks: data.clicks,
        revenue: parseFloat(data.revenue.toFixed(2))
      })
    }

    const responseData = {
      kpis: {
        revenue: { value: parseFloat(totalRevenue.toFixed(2)), change: 0, period: '30d' },
        clicks: { value: totalClicks, change: 0 },
        conversions: { value: totalConversions, change: 0 },
        cvr: { value: parseFloat(cvr.toFixed(2)), change: 0 },
        epc: { value: parseFloat(epc.toFixed(4)), change: 0 },
        roas: { value: parseFloat(roas.toFixed(2)), change: 0 },
        peakHour: peakHour
      },
      trends: trends
    }

    console.log('📤 [SUMMARY] Sending real performance data:', {
      totalClicks,
      totalRevenue: totalRevenue.toFixed(2),
      totalConversions,
      cvr: cvr.toFixed(2),
      epc: epc.toFixed(4),
      trendsCount: trends.length,
      nonZeroHours: trends.filter(t => t.clicks > 0).length
    })
    
    // Cache the response for 5 minutes (real data changes frequently)
    apiCache.set(cacheKey, responseData, 5)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('❌ [SUMMARY] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}