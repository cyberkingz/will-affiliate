import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test Affluent API directly
    const baseUrl = process.env.AFFILIATE_NETWORK_BASE_URL || 'https://login.affluentco.com/affiliates/api'
    const affiliateId = process.env.AFFILIATE_NETWORK_AFFILIATE_ID || process.env.FLUENT_AFFILIATE_ID || '208409'
    const apiKey = process.env.AFFILIATE_NETWORK_API_KEY || process.env.FLUENT_API_KEY || 'Y0R1KxgxHpi2q88ZcYi7ag'
    
    console.log('🔍 [TEST] Environment check:', {
      hasBaseUrl: !!process.env.AFFILIATE_NETWORK_BASE_URL,
      hasAffiliateId: !!process.env.AFFILIATE_NETWORK_AFFILIATE_ID,
      hasApiKey: !!process.env.AFFILIATE_NETWORK_API_KEY,
      hasFallbackId: !!process.env.FLUENT_AFFILIATE_ID,
      hasFallbackKey: !!process.env.FLUENT_API_KEY
    })
    
    const url = `${baseUrl}/Offers/Feed?affiliate_id=${affiliateId}&api_key=${apiKey}&offer_status_id=1`
    
    console.log('🌐 [TEST] Making direct API call to:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WillAffiliate-Dashboard/1.0'
      }
    })
    
    console.log('📥 [TEST] Response status:', response.status)
    
    const data = await response.json()
    
    console.log('📊 [TEST] Response data:', {
      row_count: data.row_count,
      dataLength: data.data?.length || 0,
      success: data.success,
      message: data.message,
      firstOffer: data.data?.[0] ? {
        offer_id: data.data[0].offer_id,
        offer_name: data.data[0].offer_name,
        campaign_id: data.data[0].campaign_id
      } : null
    })
    
    // Extract campaigns
    const campaignsWithIds = data.data?.filter(offer => offer.campaign_id) || []
    const uniqueCampaigns = new Map()
    
    campaignsWithIds.forEach(offer => {
      if (!uniqueCampaigns.has(offer.campaign_id)) {
        uniqueCampaigns.set(offer.campaign_id, {
          id: offer.campaign_id,
          name: offer.offer_name
        })
      }
    })
    
    return NextResponse.json({
      success: true,
      config: {
        baseUrl,
        affiliateId,
        apiKey: apiKey.substring(0, 5) + '...'
      },
      stats: {
        totalOffers: data.row_count || 0,
        offersReturned: data.data?.length || 0,
        offersWithCampaigns: campaignsWithIds.length,
        uniqueCampaigns: uniqueCampaigns.size
      },
      campaigns: Array.from(uniqueCampaigns.values()),
      sampleOffers: data.data?.slice(0, 3).map(o => ({
        offer_id: o.offer_id,
        offer_name: o.offer_name,
        campaign_id: o.campaign_id
      }))
    })
  } catch (error) {
    console.error('❌ [TEST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}