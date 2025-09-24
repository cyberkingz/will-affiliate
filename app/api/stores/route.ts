import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateStoreSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100, 'Store name is too long'),
  storeUrl: z.string().url('Invalid store URL').refine(
    (url) => url.includes('.myshopify.com') || url.includes('shopify.com'),
    'Must be a valid Shopify store URL'
  ),
  shopifyEmail: z.string().email('Invalid email address'),
  shopifyPassword: z.string().min(1, 'Password is required'),
  status: z.enum(['active', 'inactive']).default('active')
})

const UpdateStoreSchema = CreateStoreSchema.partial().extend({
  id: z.string().min(1, 'Store ID is required')
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Check if user is admin to determine query scope
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user role:', userError)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    const isAdmin = userData?.role === 'admin'

    let query = supabase
      .from('shopify_stores')
      .select('*')
      .order('created_at', { ascending: false })

    // Only filter by user_id if not admin
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status as 'active' | 'inactive')
    }

    const { data: stores, error } = await query

    // Debug: Log what we're getting from the database
    console.log('🔍 [API DEBUG] User ID:', user.id)
    console.log('🔍 [API DEBUG] Is Admin:', isAdmin)
    console.log('🔍 [API DEBUG] User Role:', userData?.role)
    console.log('🔍 [API DEBUG] Status filter:', status)
    console.log('🔍 [API DEBUG] Raw stores from DB:', stores)
    console.log('🔍 [API DEBUG] Error:', error)

    if (error) {
      console.error('Error fetching stores:', error)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    return NextResponse.json({ stores: stores || [] })
  } catch (error) {
    console.error('Error in stores GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validation = CreateStoreSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 })
    }

    const { storeName, storeUrl, shopifyEmail, shopifyPassword, status } = validation.data

    // Check if store URL already exists for this user
    const { data: existingStore } = await supabase
      .from('shopify_stores')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_url', storeUrl)
      .single()

    if (existingStore) {
      return NextResponse.json({ error: 'A store with this URL already exists' }, { status: 409 })
    }

    // Insert new store
    const { data: newStore, error } = await supabase
      .from('shopify_stores')
      .insert({
        user_id: user.id,
        store_name: storeName,
        store_url: storeUrl,
        shopify_email: shopifyEmail,
        shopify_password: shopifyPassword, // In production, this should be encrypted
        status
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating store:', error)
      return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
    }

    return NextResponse.json({ store: newStore }, { status: 201 })
  } catch (error) {
    console.error('Error in stores POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validation = UpdateStoreSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 })
    }

    const { id, ...updateData } = validation.data

    // Update store
    const { data: updatedStore, error } = await supabase
      .from('shopify_stores')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own stores
      .select()
      .single()

    if (error) {
      console.error('Error updating store:', error)
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
    }

    if (!updatedStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json({ store: updatedStore })
  } catch (error) {
    console.error('Error in stores PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('id')

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 })
    }

    // Delete store
    const { error } = await supabase
      .from('shopify_stores')
      .delete()
      .eq('id', storeId)
      .eq('user_id', user.id) // Ensure user can only delete their own stores

    if (error) {
      console.error('Error deleting store:', error)
      return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Store deleted successfully' })
  } catch (error) {
    console.error('Error in stores DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}