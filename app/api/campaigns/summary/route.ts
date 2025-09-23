import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiCache, createCacheKey } from '@/lib/cache/api-cache'
import { AffiliateNetworkAPI, DailySummaryRow, HourlySummaryData, AffluentRecord } from '@/lib/api/affiliate-network'
import { resolveNetworkAccess } from '@/lib/server/network-access'

type HourlyAggregate = {
  clicks: number
  revenue: number
  conversions: number
  spend: number
}

type TrendPoint = {
  hour: string
  time: string
  clicks: number
  revenue: number
  conversions: number
  spend: number
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  return 0
}

const extractHourKey = (row: HourlySummaryData, index: number): string => {
  const record = row as AffluentRecord
  const candidates: unknown[] = [
    row.hour,
    record['time'],
    record['datetime'],
    record['date'],
    record['h']
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      if (candidate.includes(':')) {
        const match = candidate.match(/(\d{1,2}):/)
        if (match) {
          return match[1].padStart(2, '0')
        }
      }

      if (candidate.includes('T')) {
        const parsed = new Date(candidate)
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.getHours().toString().padStart(2, '0')
        }
      }

      if (/^\d{1,2}$/.test(candidate)) {
        return candidate.padStart(2, '0')
      }
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate.toString().padStart(2, '0')
    }
  }

  return index.toString().padStart(2, '0')
}

const getRevenueFromRow = (row: HourlySummaryData): number => {
  const record = row as AffluentRecord
  const fields = ['revenue', 'payout', 'earnings', 'commission']
  for (const field of fields) {
    const value = record[field]
    if (value !== undefined && value !== null) {
      return toNumber(value)
    }
  }
  return 0
}

const getDailyKey = (row: DailySummaryRow): string => {
  const record = row as AffluentRecord
  const candidates: unknown[] = [row.date, record['day'], record['time']]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate.includes('T') ? candidate.split('T')[0] : candidate
    }
  }
  return ''
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

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
    const networkAccess = await resolveNetworkAccess(supabase, user.id, networks)

    if (!networkAccess.success) {
      return NextResponse.json({ error: networkAccess.message }, { status: networkAccess.status })
    }

    const api = new AffiliateNetworkAPI(networkAccess.networkConfig)

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
    const hourlyData: Record<string, HourlyAggregate> = {}

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
        totalClicks = dailySummaryResponse.data.reduce((sum, day) => sum + toNumber(day.clicks), 0)
        totalConversions = dailySummaryResponse.data.reduce((sum, day) => sum + toNumber(day.conversions), 0)
        totalRevenue = dailySummaryResponse.data.reduce((sum, day) => sum + toNumber(day.revenue), 0)
        
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

            console.log('🔍 [SUMMARY] Hourly Summary API response:', {
              success: hourlySummaryResponse.success,
              hasData: !!hourlySummaryResponse.data,
              dataLength: hourlySummaryResponse.data?.length || 0,
              message: hourlySummaryResponse.message
            })

            if (hourlySummaryResponse.success && hourlySummaryResponse.data && hourlySummaryResponse.data.length > 0) {
              console.log('✅ [SUMMARY] Hourly data received:', hourlySummaryResponse.data.length, 'hours')
              
              // Debug: Log first hour structure
              if (hourlySummaryResponse.data[0]) {
                console.log('🔍 [SUMMARY] First hour structure:', JSON.stringify(hourlySummaryResponse.data[0], null, 2))
                console.log('🔍 [SUMMARY] Available hourly fields:', Object.keys(hourlySummaryResponse.data[0]))
              }
              
              // Process hourly data with better field detection
              hourlySummaryResponse.data.forEach((hourData, index) => {
                const hourKey = extractHourKey(hourData, index)
                const clicks = toNumber(hourData.clicks)
                const conversions = toNumber(hourData.conversions)
                const revenue = getRevenueFromRow(hourData)
                const spend = toNumber((hourData as AffluentRecord)['spend'])

                hourlyData[hourKey] = {
                  clicks,
                  revenue,
                  conversions,
                  spend
                }

                if (clicks > 0) {
                  const record = hourData as AffluentRecord
                  console.log(`💰 [SUMMARY] Hour ${hourKey} revenue debug:`, {
                    rawRevenue: record['revenue'],
                    rawPayout: record['payout'],
                    rawEarnings: record['earnings'],
                    rawCommission: record['commission'],
                    finalRevenue: revenue,
                    spend,
                    clicks,
                    conversions
                  })
                }
              })
              
              console.log('📊 [SUMMARY] Processed hourly data:', Object.keys(hourlyData).length, 'hours')
              console.log('🔍 [SUMMARY] Sample hourly data:', Object.entries(hourlyData).slice(0, 5))
              
              // Check if hourly revenue data is missing/zero but we have daily revenue
              const hourlyRevenueTotal = Object.values(hourlyData).reduce((sum, hour) => sum + hour.revenue, 0)
              const hourlyClicksTotal = Object.values(hourlyData).reduce((sum, hour) => sum + hour.clicks, 0)
              
              console.log('💰 [SUMMARY] Hourly revenue totals:', {
                hourlyRevenueTotal: hourlyRevenueTotal.toFixed(2),
                dailyRevenueFromKPIs: totalRevenue.toFixed(2),
                hourlyClicksTotal,
                dailyClicksTotal: totalClicks
              })
              
              // If hourly revenue is missing but we have daily revenue and clicks, distribute proportionally
              if (hourlyRevenueTotal === 0 && totalRevenue > 0 && hourlyClicksTotal > 0) {
                console.log('💰 [SUMMARY] Hourly revenue missing - distributing daily revenue proportionally by clicks')
                Object.keys(hourlyData).forEach(hourKey => {
                  const hourClicks = hourlyData[hourKey].clicks || 0
                  if (hourClicks > 0) {
                    const proportionalRevenue = (hourClicks / hourlyClicksTotal) * totalRevenue
                    hourlyData[hourKey].revenue = proportionalRevenue
                    console.log(`💰 [SUMMARY] Hour ${hourKey}: ${hourClicks} clicks -> $${proportionalRevenue.toFixed(2)} revenue`)
                  }
                })
              }
            } else {
              console.warn('⚠️ [SUMMARY] Hourly Summary API returned no data, will show empty hourly chart')
            }
          } catch (error) {
            console.warn('⚠️ [SUMMARY] Hourly data not available, using empty data:', getErrorMessage(error))
          }
        }
      } else {
        console.warn('⚠️ [SUMMARY] Daily Summary API returned no data')
      }
    } catch (error) {
      console.error('❌ [SUMMARY] Daily Summary API failed:', getErrorMessage(error))
    }

    // Only use fallback if Daily Summary completely failed
    if (!dailySummarySuccess) {
      console.log('📈 [SUMMARY] Daily Summary failed, falling back to Performance Summary...')
      try {
        const performanceSummary = await api.getPerformanceSummary({
          date: apiStartDate
        })

        if (performanceSummary.success && performanceSummary.data.length > 0) {
          const summary = performanceSummary.data[0] as AffluentRecord
          const fallbackRevenue = toNumber(summary['current_revenue']) || toNumber(summary['revenue'])
          totalRevenue = fallbackRevenue
          console.log('💰 [SUMMARY] ⚠️ FALLBACK REVENUE (Performance Summary):', totalRevenue)
        }
      } catch (fallbackError) {
        console.error('❌ [SUMMARY] Fallback also failed:', getErrorMessage(fallbackError))
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

    const trends: TrendPoint[] = []
    
    if (daysDiff <= 1) {
      // Single day: Use hourly granularity
      console.log('📈 [SUMMARY] Using hourly granularity for single day')
      console.log('🔍 [SUMMARY] Available hourly data keys:', Object.keys(hourlyData))
      console.log('🔍 [SUMMARY] Sample hourly data values:', Object.entries(hourlyData).slice(0, 3))
      
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0')
        const data: HourlyAggregate = hourlyData[hour] ?? { clicks: 0, revenue: 0, conversions: 0, spend: 0 }
        trends.push({
          hour: `${hour}:00`,
          time: `${hour}:00`,
          clicks: data.clicks,
          revenue: parseFloat(data.revenue.toFixed(2)),
          conversions: data.conversions,
          spend: parseFloat(data.spend.toFixed(2))
        })
      }
      
      console.log('📊 [SUMMARY] Generated hourly trends:', trends.length, 'hours')
      console.log('🔍 [SUMMARY] Non-zero hourly trends:', trends.filter(t => t.clicks > 0 || t.revenue > 0).length)
      console.log('🔍 [SUMMARY] Sample trends:', trends.slice(0, 5))
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
          dailySummaryResponse.data.forEach(dayData => {
            const dayKey = getDailyKey(dayData)
            const revenue = Number(toNumber(dayData.revenue).toFixed(2))
            trends.push({
              hour: dayKey,
              time: dayKey,
              clicks: toNumber(dayData.clicks),
              revenue,
              conversions: toNumber(dayData.conversions),
              spend: 0
            })
          })
          
          console.log('📊 [SUMMARY] Daily trends generated:', trends.length, 'days')
        }
      } catch (error) {
        console.warn('⚠️ [SUMMARY] Daily Summary API failed for trends, generating empty data:', getErrorMessage(error))
        
        // Fallback: Generate empty trends for the date range
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
          const dayKey = d.toISOString().split('T')[0]
          trends.push({
            hour: dayKey,
            time: dayKey,
            clicks: 0,
            revenue: 0,
            conversions: 0,
            spend: 0
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
