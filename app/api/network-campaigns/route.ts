import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AffluentRecord } from '@/lib/api/affiliate-network'

const getOfferStatusName = (offer: AffluentRecord): string => {
  const status = offer['offer_status']
  if (status && typeof status === 'object' && status !== null) {
    const statusName = (status as Record<string, unknown>)['offer_status_name']
    if (typeof statusName === 'string') {
      return statusName
    }
  }
  return 'Unknown'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get network from query params
    const { searchParams } = new URL(request.url)
    const networkId = searchParams.get('network') || 'affluent'
    
    console.log('🎯 [NETWORK-CAMPAIGNS] Fetching campaigns for network:', networkId)

    // For now, we only support Affluent network
    if (networkId !== 'affluent') {
      return NextResponse.json({ 
        campaigns: [],
        message: `Network ${networkId} not supported yet` 
      })
    }

    try {
      // Use direct fetch since API client has issues
      console.log('🚀 [NETWORK-CAMPAIGNS] Getting campaigns from Offers Feed (direct fetch)...')
      
      const directUrl = `https://login.affluentco.com/affiliates/api/Offers/Feed?affiliate_id=208409&api_key=Y0R1KxgxHpi2q88ZcYi7ag&offer_status_id=1`
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const offersResponse = await response.json()
      
      console.log('📥 [NETWORK-CAMPAIGNS] Offers response:', {
        success: offersResponse.success,
        dataLength: offersResponse.data?.length || 0,
        rowCount: offersResponse.row_count
      })

      let campaigns: Array<{ id: string; name: string; campaignId: number | null; status?: string }> = []

      const offers: AffluentRecord[] = Array.isArray(offersResponse.data)
        ? (offersResponse.data as AffluentRecord[])
        : []

      if (offersResponse.success && offers.length > 0) {
        console.log('✅ [NETWORK-CAMPAIGNS] Processing offers...')
        
        // Log complete structure of first offer to understand architecture
        console.log('🔍 [NETWORK-CAMPAIGNS] Complete structure of first offer:')
        console.log(JSON.stringify(offers[0], null, 2))
        
        // Log all available fields across all offers
        const allFields = new Set()
        offers.forEach((offer) => {
          Object.keys(offer).forEach(key => allFields.add(key))
        })
        console.log('📋 [NETWORK-CAMPAIGNS] All available fields in offers:', Array.from(allFields).sort())
        
        // Log campaign and sub ID data specifically
        console.log('🎯 [NETWORK-CAMPAIGNS] Campaign and SubID analysis:')
        offers.forEach((offer, index) => {
          console.log(`  Offer ${index + 1}:`, {
            offer_id: offer.offer_id,
            offer_name: offer.offer_name,
            campaign_id: offer.campaign_id,
            offer_contract_id: offer.offer_contract_id,
            vertical_name: offer.vertical_name,
            price: offer.price,
            price_format: offer.price_format,
            status: getOfferStatusName(offer),
            // Look for any sub_id related fields
            sub_fields: Object.keys(offer).filter(key => 
              key.toLowerCase().includes('sub') || 
              key.toLowerCase().includes('id') ||
              key.toLowerCase().includes('tracking')
            ).reduce<Record<string, unknown>>((acc, key) => {
              acc[key] = offer[key]
              return acc
            }, {})
          })
        })
        
        // Extract offers (what affiliates choose to promote)
        let offersProcessed = 0
        
        offers.forEach((offer) => {
          const offerId = offer.offer_id
          const offerName = offer.offer_name
          if ((typeof offerId === 'string' || typeof offerId === 'number') && typeof offerName === 'string') {
            campaigns.push({
              id: offerId.toString(),
              name: offerName,
              campaignId: typeof offer.campaign_id === 'number' ? offer.campaign_id : null,
              status: getOfferStatusName(offer)
            })
            offersProcessed++
          }
        })
        
        console.log('🎯 [NETWORK-CAMPAIGNS] Offers processed:', offersProcessed)
        console.log('🎯 [NETWORK-CAMPAIGNS] Available offers:', campaigns.length)
        console.log('📋 [NETWORK-CAMPAIGNS] Campaign names:', campaigns.map(c => c.name))
      }

      // Always add "All Offers" option at the beginning
      if (campaigns.length > 0) {
        campaigns.unshift({
          id: 'all',
          name: 'All Offers',
          campaignId: null
        })
      } else {
        console.log('⚠️ [NETWORK-CAMPAIGNS] No offers found from API')
        campaigns = [{
          id: 'all',
          name: 'All Offers',
          campaignId: null
        }]
      }

      console.log('📤 [NETWORK-CAMPAIGNS] Returning offers to frontend:', campaigns.length)
      console.log('📋 [NETWORK-CAMPAIGNS] Final offer list:', campaigns.map(c => ({
        id: c.id,
        name: c.name,
        campaignId: c.campaignId,
        status: c.status
      })))
      
      return NextResponse.json({ campaigns })
      
    } catch (apiError) {
      console.error('❌ [NETWORK-CAMPAIGNS] API Error:', apiError)
      return NextResponse.json({ 
        campaigns: [{ id: 'all', name: 'All Campaigns', offerId: null }],
        error: 'Failed to fetch campaigns from network'
      })
    }

  } catch (error) {
    console.error('❌ [NETWORK-CAMPAIGNS] Critical error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
