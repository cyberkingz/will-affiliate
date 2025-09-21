import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test calls to Affluent API using cranads.com approach
    const baseUrl = 'https://login.affluentco.com/affiliates/api'
    const affiliateId = '208409'
    const apiKey = 'Y0R1KxgxHpi2q88ZcYi7ag'
    
    const today = new Date()
    const startDate = today.toISOString().split('T')[0] + ' 00:00:00'
    const endDate = today.toISOString().split('T')[0] + ' 23:59:59'

    console.log('🧪 [CRANADS-TEST] Testing Affluent API calls like cranads.com...')
    
    const tests = []

    // Test 1: Try to get clicks with specific fields
    try {
      console.log('📡 [CRANADS-TEST] Test 1: Getting clicks with fields...')
      const clicksUrl = `${baseUrl}/Reports/Clicks?affiliate_id=${affiliateId}&api_key=${apiKey}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&row_limit=10`
      
      const clicksResponse = await fetch(clicksUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })
      
      const clicksData = await clicksResponse.json()
      tests.push({
        name: 'Clicks API',
        success: clicksData.success,
        count: clicksData.row_count || 0,
        sampleData: clicksData.data?.[0] || null
      })
    } catch (error) {
      tests.push({
        name: 'Clicks API',
        success: false,
        error: error.message
      })
    }

    // Test 2: Try Campaign Summary
    try {
      console.log('📡 [CRANADS-TEST] Test 2: Getting campaign summary...')
      const summaryUrl = `${baseUrl}/Reports/CampaignSummary?affiliate_id=${affiliateId}&api_key=${apiKey}&start_date=${today.toISOString().split('T')[0]}&end_date=${today.toISOString().split('T')[0]}`
      
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })
      
      const summaryData = await summaryResponse.json()
      tests.push({
        name: 'Campaign Summary',
        success: summaryData.success,
        count: summaryData.row_count || 0,
        sampleData: summaryData.data?.[0] || null
      })
    } catch (error) {
      tests.push({
        name: 'Campaign Summary',
        success: false,
        error: error.message
      })
    }

    // Test 3: Try Offers/Campaign endpoint  
    try {
      console.log('📡 [CRANADS-TEST] Test 3: Getting campaigns...')
      const campaignUrl = `${baseUrl}/Offers/Campaign?affiliate_id=${affiliateId}&api_key=${apiKey}&fields=campaign_id,offer_name,status_name`
      
      const campaignResponse = await fetch(campaignUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })
      
      const campaignData = await campaignResponse.json()
      tests.push({
        name: 'Campaign API',
        success: campaignData.success,
        count: campaignData.row_count || 0,
        sampleData: campaignData.data?.[0] || null
      })
    } catch (error) {
      tests.push({
        name: 'Campaign API', 
        success: false,
        error: error.message
      })
    }

    // Test 4: Try Offers Feed with active status
    try {
      console.log('📡 [CRANADS-TEST] Test 4: Getting offers feed...')
      const offersUrl = `${baseUrl}/Offers/Feed?affiliate_id=${affiliateId}&api_key=${apiKey}&offer_status_id=1`
      
      const offersResponse = await fetch(offersUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })
      
      const offersData = await offersResponse.json()
      
      // Count offers with campaign IDs
      const offersWithCampaigns = offersData.data?.filter(o => o.campaign_id) || []
      
      tests.push({
        name: 'Offers Feed',
        success: offersData.success,
        count: offersData.row_count || 0,
        offersWithCampaigns: offersWithCampaigns.length,
        sampleOfferWithCampaign: offersWithCampaigns[0] || null
      })
    } catch (error) {
      tests.push({
        name: 'Offers Feed',
        success: false,
        error: error.message
      })
    }

    console.log('📤 [CRANADS-TEST] Test results:', tests)

    return NextResponse.json({
      message: 'API Tests Complete',
      config: {
        baseUrl,
        affiliateId,
        startDate,
        endDate
      },
      tests
    })
    
  } catch (error) {
    console.error('❌ [CRANADS-TEST] Error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}