import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { NetworkConfig, defaultNetworkConfig } from '@/lib/api/affiliate-network'

type TypedSupabaseClient = SupabaseClient<Database>

type UserRow = Database['public']['Tables']['users']['Row']
type NetworkConnectionRow = Database['public']['Tables']['network_connections']['Row']

interface NetworkAccessSuccess {
  success: true
  role: UserRow['role']
  accessibleNetworks: NetworkConnectionRow[]
  authorizedNetworks: NetworkConnectionRow[]
  primaryNetwork: NetworkConnectionRow | null
  networkConfig: NetworkConfig
  unauthorizedRequestedIds: string[]
}

interface NetworkAccessFailure {
  success: false
  status: number
  message: string
  unauthorizedRequestedIds?: string[]
}

export type NetworkAccessResult = NetworkAccessSuccess | NetworkAccessFailure

const sanitizeRequestedIds = (ids: string[] | undefined | null): string[] => {
  if (!ids || ids.length === 0) {
    return []
  }

  // Normalize IDs and remove duplicates/empty values
  const cleaned = ids
    .map(id => id?.trim())
    .filter((id): id is string => Boolean(id && id.length > 0))

  return Array.from(new Set(cleaned))
}

export async function resolveNetworkAccess(
  supabase: TypedSupabaseClient,
  userId: string,
  requestedNetworkIds?: string[]
): Promise<NetworkAccessResult> {
  // Load user profile to determine role
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('[NetworkAccess] Failed to load user profile', profileError)
    return {
      success: false,
      status: 500,
      message: 'Unable to load user profile'
    }
  }

  if (!userProfile) {
    return {
      success: false,
      status: 404,
      message: 'User profile not found'
    }
  }

  const normalizedRequestedIds = sanitizeRequestedIds(requestedNetworkIds)

  // Fetch accessible network connections based on user role
  let networks: NetworkConnectionRow[] = []
  
  if (userProfile.role === 'admin') {
    // Admins can access all active networks
    console.log('[NetworkAccess] User is admin, fetching all active networks...')
    const { data: allNetworks, error: networksError } = await supabase
      .from('network_connections')
      .select('*')
      .eq('is_active', true)
    
    console.log('[NetworkAccess] Network query result:', { 
      data: allNetworks, 
      error: networksError,
      dataLength: allNetworks?.length || 0
    })
    
    if (networksError) {
      console.error('[NetworkAccess] Failed to load network connections', networksError)
      return {
        success: false,
        status: 500,
        message: 'Unable to load network connections'
      }
    }
    
    networks = allNetworks ?? []
  } else {
    // Staff users can only access networks they've been granted access to
    const { data: userNetworks, error: networksError } = await supabase
      .from('user_network_access')
      .select(`
        network_connection_id,
        network_connections!inner (
          id,
          name,
          network_type,
          affiliate_id,
          api_key,
          is_active,
          last_sync_at,
          last_sync_status,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('network_connections.is_active', true)
    
    if (networksError) {
      console.error('[NetworkAccess] Failed to load user network access', networksError)
      return {
        success: false,
        status: 500,
        message: 'Unable to load network access'
      }
    }
    
    // Extract the network connections from the join
    networks = (userNetworks ?? []).map(access => access.network_connections as NetworkConnectionRow)
  }

  const accessibleNetworks = networks ?? []
  console.log(`[NetworkAccess] User ${userId} (${userProfile.role}) has access to ${accessibleNetworks.length} networks:`, accessibleNetworks.map(n => n.name))
  
  const availableIds = new Set(accessibleNetworks.map(network => network.id))

  // Determine any requested networks that the user cannot access
  const unauthorizedRequestedIds = normalizedRequestedIds.filter(id => !availableIds.has(id))

  if (unauthorizedRequestedIds.length > 0 && userProfile.role !== 'admin') {
    return {
      success: false,
      status: 403,
      message: 'You do not have access to one or more selected networks',
      unauthorizedRequestedIds
    }
  }

  // If specific networks were requested, narrow down to those
  const authorizedNetworks = normalizedRequestedIds.length > 0
    ? accessibleNetworks.filter(network => normalizedRequestedIds.includes(network.id))
    : accessibleNetworks

  const primaryNetwork = authorizedNetworks[0] ?? accessibleNetworks[0] ?? null

  // Staff members must have at least one accessible network
  if (!primaryNetwork && userProfile.role !== 'admin') {
    return {
      success: false,
      status: 403,
      message: 'No network access assigned'
    }
  }

  // Determine the network configuration we will use for API requests
  const networkConfig: NetworkConfig = primaryNetwork
    ? {
        baseUrl: defaultNetworkConfig.baseUrl,
        affiliateId: primaryNetwork.affiliate_id || defaultNetworkConfig.affiliateId,
        apiKey: primaryNetwork.api_key || defaultNetworkConfig.apiKey,
        name: primaryNetwork.name || defaultNetworkConfig.name
      }
    : {
        ...defaultNetworkConfig
      }

  if (!networkConfig.affiliateId || !networkConfig.apiKey) {
    return {
      success: false,
      status: 500,
      message: 'Network credentials are not configured'
    }
  }

  return {
    success: true,
    role: userProfile.role,
    accessibleNetworks,
    authorizedNetworks,
    primaryNetwork,
    networkConfig,
    unauthorizedRequestedIds
  }
}
