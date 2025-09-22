import { NextResponse } from 'next/server'
import { AffluentRecord } from '@/lib/api/affiliate-network'

const normalizeError = (error: unknown): Error => (
  error instanceof Error ? error : new Error(String(error))
)

export async function GET() {
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
    const offers: AffluentRecord[] = Array.isArray(data.data)
      ? (data.data as AffluentRecord[])
      : []
    
    console.log('📊 [TEST] Response data:', {
      row_count: data.row_count,
      dataLength: offers.length,
      success: data.success,
      message: data.message,
      firstOffer: offers[0] ? {
        offer_id: offers[0].offer_id,
        offer_name: offers[0].offer_name,
        campaign_id: offers[0].campaign_id
      } : null
    })
    
    // Extract campaigns
    const campaignsWithIds = offers.filter(offer => 
      typeof offer.campaign_id === 'number' || typeof offer.campaign_id === 'string'
    )
    const uniqueCampaigns = new Map<string | number, { id: string; name: string }>()
    
    campaignsWithIds.forEach(offer => {
      const campaignId = offer.campaign_id
      const offerName = offer.offer_name
      if ((typeof campaignId === 'string' || typeof campaignId === 'number') && typeof offerName === 'string') {
        if (!uniqueCampaigns.has(campaignId)) {
          uniqueCampaigns.set(campaignId, {
            id: campaignId.toString(),
            name: offerName
          })
        }
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
        offersReturned: offers.length,
        offersWithCampaigns: campaignsWithIds.length,
        uniqueCampaigns: uniqueCampaigns.size
      },
      campaigns: Array.from(uniqueCampaigns.values()),
      sampleOffers: offers.slice(0, 3).map(o => ({
        offer_id: o.offer_id,
        offer_name: o.offer_name,
        campaign_id: o.campaign_id
      }))
    })
  } catch (error) {
    const apiError = normalizeError(error)
    console.error('❌ [TEST] Error:', apiError)
    return NextResponse.json({
      success: false,
      error: apiError.message,
      stack: apiError.stack
    })
  }
}
