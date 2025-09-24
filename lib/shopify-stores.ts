// ================================================================
// Shopify Stores Utility Functions
// ================================================================

import { createClient } from '@supabase/supabase-js'
import type { 
  Database, 
  ShopifyStore, 
  ShopifyStoreInsert, 
  ShopifyStoreUpdate,
  ShopifyStoreFormData,
  ShopifyUrlValidation,
  StoreStatus
} from '@/types/supabase'

// Initialize Supabase client (you should import this from your main supabase config)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Validates a Shopify store URL
 */
export function validateShopifyUrl(url: string): ShopifyUrlValidation {
  if (!url || url.trim() === '') {
    return {
      is_valid: false,
      error_message: 'Store URL is required'
    }
  }

  const cleanUrl = url.trim().toLowerCase()
  
  // Check if URL contains required Shopify domains
  const hasShopifyDomain = cleanUrl.includes('shopify.com') || cleanUrl.includes('.myshopify.com')
  
  if (!hasShopifyDomain) {
    return {
      is_valid: false,
      error_message: 'URL must contain "shopify.com" or ".myshopify.com"'
    }
  }

  // Normalize URL (add https if missing)
  let normalizedUrl = cleanUrl
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  return {
    is_valid: true,
    normalized_url: normalizedUrl
  }
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Get all Shopify stores for the current user
 */
export async function getUserShopifyStores(userId: string): Promise<ShopifyStore[]> {
  const { data, error } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching Shopify stores:', error)
    throw new Error('Failed to fetch Shopify stores')
  }

  return data || []
}

/**
 * Get active Shopify stores for the current user
 */
export async function getActiveUserShopifyStores(userId: string): Promise<ShopifyStore[]> {
  const { data, error } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active Shopify stores:', error)
    throw new Error('Failed to fetch active Shopify stores')
  }

  return data || []
}

/**
 * Get a single Shopify store by ID
 */
export async function getShopifyStore(storeId: string): Promise<ShopifyStore | null> {
  const { data, error } = await supabase
    .from('shopify_stores')
    .select('*')
    .eq('id', storeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Store not found
    }
    console.error('Error fetching Shopify store:', error)
    throw new Error('Failed to fetch Shopify store')
  }

  return data
}

/**
 * Create a new Shopify store
 */
export async function createShopifyStore(
  userId: string, 
  storeData: ShopifyStoreFormData
): Promise<ShopifyStore> {
  // Validate URL
  const urlValidation = validateShopifyUrl(storeData.store_url)
  if (!urlValidation.is_valid) {
    throw new Error(urlValidation.error_message)
  }

  // Validate email
  if (!validateEmail(storeData.shopify_email)) {
    throw new Error('Please enter a valid email address')
  }

  const insertData: ShopifyStoreInsert = {
    user_id: userId,
    store_name: storeData.store_name.trim(),
    store_url: urlValidation.normalized_url!,
    shopify_email: storeData.shopify_email.trim(),
    shopify_password: storeData.shopify_password,
    status: storeData.status || 'active'
  }

  const { data, error } = await supabase
    .from('shopify_stores')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a store with this URL')
    }
    console.error('Error creating Shopify store:', error)
    throw new Error('Failed to create Shopify store')
  }

  return data
}

/**
 * Update a Shopify store
 */
export async function updateShopifyStore(
  storeId: string,
  updateData: Partial<ShopifyStoreFormData>
): Promise<ShopifyStore> {
  const updates: ShopifyStoreUpdate = {}

  if (updateData.store_name !== undefined) {
    updates.store_name = updateData.store_name.trim()
  }

  if (updateData.store_url !== undefined) {
    const urlValidation = validateShopifyUrl(updateData.store_url)
    if (!urlValidation.is_valid) {
      throw new Error(urlValidation.error_message)
    }
    updates.store_url = urlValidation.normalized_url!
  }

  if (updateData.shopify_email !== undefined) {
    if (!validateEmail(updateData.shopify_email)) {
      throw new Error('Please enter a valid email address')
    }
    updates.shopify_email = updateData.shopify_email.trim()
  }

  if (updateData.shopify_password !== undefined) {
    updates.shopify_password = updateData.shopify_password
  }

  if (updateData.status !== undefined) {
    updates.status = updateData.status
  }

  const { data, error } = await supabase
    .from('shopify_stores')
    .update(updates)
    .eq('id', storeId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a store with this URL')
    }
    console.error('Error updating Shopify store:', error)
    throw new Error('Failed to update Shopify store')
  }

  return data
}

/**
 * Update store status
 */
export async function updateShopifyStoreStatus(
  storeId: string,
  status: StoreStatus
): Promise<ShopifyStore> {
  const { data, error } = await supabase
    .from('shopify_stores')
    .update({ status })
    .eq('id', storeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating store status:', error)
    throw new Error('Failed to update store status')
  }

  return data
}

/**
 * Delete a Shopify store
 */
export async function deleteShopifyStore(storeId: string): Promise<void> {
  const { error } = await supabase
    .from('shopify_stores')
    .delete()
    .eq('id', storeId)

  if (error) {
    console.error('Error deleting Shopify store:', error)
    throw new Error('Failed to delete Shopify store')
  }
}

/**
 * Check if user already has a store with the given URL
 */
export async function checkDuplicateStoreUrl(
  userId: string, 
  storeUrl: string, 
  excludeStoreId?: string
): Promise<boolean> {
  const urlValidation = validateShopifyUrl(storeUrl)
  if (!urlValidation.is_valid) {
    return false
  }

  let query = supabase
    .from('shopify_stores')
    .select('id')
    .eq('user_id', userId)
    .eq('store_url', urlValidation.normalized_url!)

  if (excludeStoreId) {
    query = query.neq('id', excludeStoreId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking duplicate store URL:', error)
    return false
  }

  return (data || []).length > 0
}

/**
 * Get store count by status for a user
 */
export async function getStoreCountByStatus(userId: string): Promise<{
  total: number
  active: number
  inactive: number
}> {
  const { data, error } = await supabase
    .from('shopify_stores')
    .select('status')
    .eq('user_id', userId)

  if (error) {
    console.error('Error getting store counts:', error)
    throw new Error('Failed to get store counts')
  }

  const counts = {
    total: data.length,
    active: data.filter(store => store.status === 'active').length,
    inactive: data.filter(store => store.status === 'inactive').length
  }

  return counts
}