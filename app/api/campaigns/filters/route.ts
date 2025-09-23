import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveNetworkAccess } from '@/lib/server/network-access'

export async function GET() {
  try {
    console.log('🚀 [FILTERS-FRESH] Starting FRESH filters endpoint...')
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [FILTERS-FRESH] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ [FILTERS-FRESH] User authenticated:', user.id)

    console.log('🔍 [FILTERS-FRESH] Calling resolveNetworkAccess for user:', user.id)
    const networkAccess = await resolveNetworkAccess(supabase, user.id)
    console.log('📋 [FILTERS-FRESH] Network access result:', {
      success: networkAccess.success,
      accessibleNetworksCount: networkAccess.success ? networkAccess.accessibleNetworks.length : 0,
      role: networkAccess.success ? networkAccess.role : 'unknown',
      message: !networkAccess.success ? networkAccess.message : 'Success'
    })

    if (!networkAccess.success) {
      console.warn('⚠️ [FILTERS-FRESH] Network access failed:', networkAccess.message)
      return NextResponse.json({
        networks: [],
        campaigns: [],
        subIds: [],
        subIds1: [],
        subIds2: [],
        error: networkAccess.message
      })
    }

    const networks = networkAccess.accessibleNetworks.map(network => ({
      id: network.id,
      name: network.name,
      status: network.is_active ? 'active' : 'inactive'
    }))

    console.log('📡 [FILTERS-FRESH] Accessible networks resolved:', networks)

    const response = {
      networks: networks,
      campaigns: [],
      subIds: [],
      subIds1: [],
      subIds2: [],
      subIds3: [],
      subIds4: [],
      subIds5: []
    }
    
    console.log('📤 [FILTERS-FRESH] Final response:', {
      networksCount: response.networks.length,
      campaignsCount: response.campaigns.length,
      subIdsCount: response.subIds.length
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [FILTERS-FRESH] Critical error in filters endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}