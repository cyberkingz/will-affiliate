import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's accessible networks
    const { data: userNetworks } = await supabase
      .rpc('get_user_accessible_networks', { target_user_id: user.id })

    const accessibleNetworkIds = userNetworks?.map(n => n.network_id) || []
    
    if (accessibleNetworkIds.length === 0) {
      return NextResponse.json({
        isActive: false,
        lastSync: null,
        activeSyncs: 0,
        recentSyncs: []
      })
    }

    // Check for currently running syncs
    const { data: runningSyncs } = await supabase
      .from('sync_logs')
      .select(`
        id,
        network_connection_id,
        started_at,
        network_connections!inner(name)
      `)
      .in('network_connection_id', accessibleNetworkIds)
      .eq('status', 'running')
      .order('started_at', { ascending: false })

    // Get recent sync history (last 10 syncs)
    const { data: recentSyncs } = await supabase
      .from('sync_logs')
      .select(`
        id,
        network_connection_id,
        started_at,
        completed_at,
        status,
        records_synced,
        error_message,
        network_connections!inner(name)
      `)
      .in('network_connection_id', accessibleNetworkIds)
      .order('started_at', { ascending: false })
      .limit(10)

    // Get the most recent successful sync across all networks
    const { data: lastSuccessfulSync } = await supabase
      .from('sync_logs')
      .select('completed_at')
      .in('network_connection_id', accessibleNetworkIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)

    const isActive = (runningSyncs?.length || 0) > 0
    const lastSync = lastSuccessfulSync?.[0]?.completed_at || null

    return NextResponse.json({
      isActive,
      lastSync,
      activeSyncs: runningSyncs?.length || 0,
      recentSyncs: recentSyncs?.map(sync => ({
        id: sync.id,
        networkName: sync.network_connections.name,
        status: sync.status,
        startedAt: sync.started_at,
        completedAt: sync.completed_at,
        recordsSynced: sync.records_synced,
        errorMessage: sync.error_message
      })) || []
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
