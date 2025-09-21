import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get user's accessible networks
    const { data: userNetworks } = await supabase
      .rpc('get_user_accessible_networks', { target_user_id: user.id })

    const accessibleNetworkIds = userNetworks?.map(n => n.network_id) || []
    
    if (accessibleNetworkIds.length === 0) {
      return NextResponse.json({
        conversions: []
      })
    }

    // Generate mock conversions data
    const mockConversions = []
    const offerNames = ['Playful Rewards - RevShare']
    const mockSubIds = ['aug301', '', '']
    const prices = [0.00, 3.08, 10.01]
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      mockConversions.push({
        id: `conversion_${i + 1}`,
        dateTime: date.toISOString(),
        offerName: offerNames[Math.floor(Math.random() * offerNames.length)],
        subId: mockSubIds[Math.floor(Math.random() * mockSubIds.length)],
        subId2: mockSubIds[Math.floor(Math.random() * mockSubIds.length)],
        price: prices[Math.floor(Math.random() * prices.length)]
      })
    }

    // Sort by date descending
    mockConversions.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())

    return NextResponse.json({ conversions: mockConversions })
  } catch (error) {
    console.error('Error fetching conversions data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}