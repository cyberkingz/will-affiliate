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

    // Format dates for API with explicit Eastern Time bounds
    const startDateOnly = startDate.split('T')[0] // Extract YYYY-MM-DD from 2025-09-01
    const endDateOnly = endDate.split('T')[0] // Extract YYYY-MM-DD from 2025-09-21
    
    // Add explicit time bounds for Eastern Time
    const apiStartDate = `${startDateOnly} 00:00:00` // Start of day ET
    const apiEndDate = `${endDateOnly} 23:59:59` // End of day ET
    
    console.log('📅 [SUMMARY] Using Eastern Time bounds:', {
      startDateOnly,
      endDateOnly,
      apiStartDate,
      apiEndDate
    })

    console.log('🌐 [SUMMARY] Fetching data from Daily Summary API (matches Affluent dashboard)...')
    
    // Calculate date range first
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24))
    
    console.log('📊 [SUMMARY] Date range analysis:', {
      startDate: apiStartDate,
      endDate: apiEndDate,
      daysDiff: daysDiff
    })
    
    // Initialize tracking variables
    let totalRevenue = 0
    let totalClicks = 0
    let totalConversions = 0
    let hourlyData: Record<string, { clicks: number; revenue: number }> = {}

    // Fetch Daily Summary data - this matches exactly what the Affluent dashboard shows
    console.log('📊 [SUMMARY] Fetching daily summary data...')
    let dailySummarySuccess = false
    
    try {
      const dailySummaryResponse = await api.getDailySummary({
        start_date: apiStartDate,
        end_date: apiEndDate
      })

      console.log('📋 [SUMMARY] Daily Summary API response:', {
        success: dailySummaryResponse.success,
        hasData: !!dailySummaryResponse.data,
        dataLength: dailySummaryResponse.data?.length || 0
      })

      if (dailySummaryResponse.success && dailySummaryResponse.data && dailySummaryResponse.data.length > 0) {
        console.log('✅ [SUMMARY] Daily summary data received:', dailySummaryResponse.data.length, 'days')
        
        // Debug: Log first day structure
        if (dailySummaryResponse.data[0]) {
          console.log('🔍 [SUMMARY] First day structure:', JSON.stringify(dailySummaryResponse.data[0], null, 2))
          console.log('🔍 [SUMMARY] Available daily fields:', Object.keys(dailySummaryResponse.data[0]))
        }
        
        // Calculate totals from daily data
        totalClicks = dailySummaryResponse.data.reduce((sum: number, day: any) => sum + (day.clicks || 0), 0)
        totalConversions = dailySummaryResponse.data.reduce((sum: number, day: any) => sum + (day.conversions || 0), 0)
        totalRevenue = dailySummaryResponse.data.reduce((sum: number, day: any) => sum + (day.revenue || 0), 0)
        
        console.log('📊 [SUMMARY] ✅ TOTALS FROM DAILY SUMMARY API:', {
          totalClicks,
          totalConversions, 
          totalRevenue: totalRevenue.toFixed(2),
          source: 'Daily Summary API'
        })
        
        dailySummarySuccess = true

        // For single day view, we need hourly breakdown
        if (daysDiff <= 1) {
          console.log('🕐 [SUMMARY] Single day - fetching hourly data...')
          try {
            const hourlySummaryResponse = await api.getHourlySummary({
              start_date: apiStartDate,
              end_date: apiEndDate
            })

            if (hourlySummaryResponse.success && hourlySummaryResponse.data) {
              console.log('✅ [SUMMARY] Hourly data received:', hourlySummaryResponse.data.length, 'hours')
              
              // Process hourly data
              hourlySummaryResponse.data.forEach((hourData: any) => {
                const hour = hourData.hour || hourData.time || '00'
                hourlyData[hour] = {
                  clicks: hourData.clicks || 0,
                  revenue: hourData.revenue || 0
                }
              })
            }
          } catch (error) {
            console.warn('⚠️ [SUMMARY] Hourly data not available, using daily data:', error.message)
          }
        }
      } else {
        console.warn('⚠️ [SUMMARY] Daily Summary API returned no data')
      }
    } catch (error) {
      console.error('❌ [SUMMARY] Daily Summary API failed:', error.message)
    }

    // Only use fallback if Daily Summary completely failed
    if (!dailySummarySuccess) {
      console.log('📈 [SUMMARY] Daily Summary failed, falling back to Performance Summary...')
      try {
        const performanceSummary = await api.getPerformanceSummary({
          date: apiStartDate
        })

        if (performanceSummary.success && performanceSummary.data.length > 0) {
          const summary = performanceSummary.data[0]
          totalRevenue = summary.current_revenue || summary.revenue || 0
          console.log('💰 [SUMMARY] ⚠️ FALLBACK REVENUE (Performance Summary):', totalRevenue)
        }
      } catch (fallbackError) {
        console.error('❌ [SUMMARY] Fallback also failed:', fallbackError.message)
      }
    }

    // Find peak click hour
    let peakHour = { value: '--', clicks: 0 }
    Object.entries(hourlyData).forEach(([hour, data]) => {
      if (data.clicks > peakHour.clicks) {
        peakHour = { value: `${hour}:00`, clicks: data.clicks }
      }
    })

    // Calculate metrics (CVR as proper percentage)
    const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const epc = totalClicks > 0 ? totalRevenue / totalClicks : 0
    const roas = totalRevenue > 0 ? (totalRevenue / Math.max(totalRevenue * 0.1, 1)) : 0 // Assuming 10% cost

    // Date range already calculated above

    let trends = []
    
    if (daysDiff <= 1) {
      // Single day: Use hourly granularity
      console.log('📈 [SUMMARY] Using hourly granularity for single day')
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0')
        const data = hourlyData[hour] || { clicks: 0, revenue: 0 }
        trends.push({
          hour: `${hour}:00`,
          time: `${hour}:00`,
          clicks: data.clicks,
          revenue: parseFloat(data.revenue.toFixed(2)),
          conversions: 0 // Hourly conversions not available
        })
      }
    } else {
      // Multiple days: Use daily granularity from Daily Summary API
      console.log('📈 [SUMMARY] Using daily granularity from Daily Summary API')
      
      try {
        const dailySummaryResponse = await api.getDailySummary({
          start_date: apiStartDate,
          end_date: apiEndDate
        })

        if (dailySummaryResponse.success && dailySummaryResponse.data) {
          console.log('📊 [SUMMARY] Processing', dailySummaryResponse.data.length, 'days from Daily Summary')
          
          // Simple: just use the API data as-is
          dailySummaryResponse.data.forEach((dayData: any) => {
            const dayKey = (dayData.date || dayData.day || dayData.time).split('T')[0]
            trends.push({
              hour: dayKey,
              time: dayKey,
              clicks: dayData.clicks || 0,
              revenue: parseFloat((dayData.revenue || 0).toFixed(2)),
              conversions: dayData.conversions || 0
            })
          })
          
          console.log('📊 [SUMMARY] Daily trends generated:', trends.length, 'days')
        }
      } catch (error) {
        console.warn('⚠️ [SUMMARY] Daily Summary API failed for trends, generating empty data:', error.message)
        
        // Fallback: Generate empty trends for the date range
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
          const dayKey = d.toISOString().split('T')[0]
          trends.push({
            hour: dayKey,
            time: dayKey,
            clicks: 0,
            revenue: 0,
            conversions: 0
          })
        }
      }
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