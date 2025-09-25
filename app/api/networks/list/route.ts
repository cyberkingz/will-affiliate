import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('🔍 [NETWORKS-LIST] Starting networks list endpoint...')
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [NETWORKS-LIST] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ [NETWORKS-LIST] User authenticated:', user.id)

    // Fetch network connections from database only - no external API calls
    console.log('📡 [NETWORKS-LIST] Fetching network connections from database...')
    const { data: networkConnections } = await supabase
      .from('network_connections')
      .select('id, name, network_type, is_active')
      .eq('is_active', true)

    console.log('📊 [NETWORKS-LIST] Network connections found:', networkConnections?.length || 0)

    // Format networks for frontend
    let networks: Array<{ id: string; name: string; status: string }> = []
    if (networkConnections && networkConnections.length > 0) {
      networks = networkConnections.map(network => ({
        id: network.id,
        name: network.name,
        status: network.is_active ? 'active' : 'inactive'
      }))
    } else {
      console.log('📡 [NETWORKS-LIST] No network connections found, using Affluent as fallback')
      networks = [{
        id: 'affluent',
        name: 'Affluent',
        status: 'active'
      }]
    }

    const response = { networks }

    console.log('📤 [NETWORKS-LIST] Final response:', { 
      networksCount: response.networks.length
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [NETWORKS-LIST] Critical error in networks list endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}