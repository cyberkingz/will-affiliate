import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ connectionId: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { connectionId } = await context.params

    // Get the network connection
    const { data: connection, error: connectionError } = await supabase
      .from('network_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Network connection not found' }, { status: 404 })
    }

    if (!connection.is_active) {
      return NextResponse.json({ error: 'Network connection is inactive' }, { status: 400 })
    }

    // Create a sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('sync_logs')
      .insert([{
        network_connection_id: connectionId,
        status: 'running',
        records_synced: 0,
        created_by: user.id
      }])
      .select()
      .single()

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError)
      return NextResponse.json({ error: 'Failed to start sync' }, { status: 500 })
    }

    // Update network connection sync status
    await supabase
      .from('network_connections')
      .update({
        last_sync_status: 'pending',
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    // In a real implementation, you would:
    // 1. Queue a background job to perform the actual sync
    // 2. Call the appropriate network API based on connection.network_type
    // 3. Process and store the campaign data
    // 4. Update the sync log with results
    
    // For now, we'll simulate a sync process
    setTimeout(async () => {
      await simulateSync(connectionId, syncLog.id, connection.network_type)
    }, 1000)

    return NextResponse.json({
      message: 'Sync started successfully',
      sync_id: syncLog.id
    })
  } catch (error) {
    console.error('Error starting sync:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Simulate sync process - in production this would be a background job
async function simulateSync(connectionId: string, syncLogId: string, networkType: string) {
  const supabase = await createClient()
  
  try {
    // Simulate network API call delay
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Generate some sample data based on network type
    const sampleData = generateSampleData(connectionId, networkType)
    
    // Insert sample campaign data
    if (sampleData.length > 0) {
      const { error: insertError } = await supabase
        .from('campaigns_data')
        .upsert(sampleData, {
          onConflict: 'network_connection_id,campaign_id,day',
          ignoreDuplicates: false
        })

      if (insertError) {
        throw insertError
      }
    }

    // Update sync log as completed
    await supabase
      .from('sync_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_synced: sampleData.length
      })
      .eq('id', syncLogId)

    // Update network connection
    await supabase
      .from('network_connections')
      .update({
        last_sync_status: 'success',
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connectionId)

  } catch (error) {
    console.error('Sync failed:', error)
    
    // Update sync log as failed
    await supabase
      .from('sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', syncLogId)

    // Update network connection
    await supabase
      .from('network_connections')
      .update({
        last_sync_status: 'error',
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connectionId)
  }
}

function generateSampleData(connectionId: string, networkType: string) {
  const data = []
  const today = new Date()
  
  // Generate data for the last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
    const dateStr = date.toISOString().split('T')[0]
    
    // Generate 2-3 campaigns per day
    for (let j = 1; j <= Math.floor(Math.random() * 3) + 1; j++) {
      const clicks = Math.floor(Math.random() * 1000) + 100
      const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.01)) // 1-11% CVR
      const revenue = conversions * (Math.random() * 100 + 20) // $20-120 per conversion
      
      data.push({
        network_connection_id: connectionId,
        campaign_id: `${networkType}_campaign_${j}`,
        campaign_name: `${networkType.toUpperCase()} Campaign ${j}`,
        day: dateStr,
        clicks,
        conversions,
        revenue: Math.round(revenue * 100) / 100,
        impressions: clicks * (Math.floor(Math.random() * 10) + 5) // 5-15x clicks
      })
    }
  }
  
  return data
}
