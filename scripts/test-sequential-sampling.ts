#!/usr/bin/env tsx
/**
 * Test Sequential Sampling Strategy
 *
 * Compares gap-based vs sequential sampling to verify Sub ID coverage
 */

import { AffiliateNetworkAPI, NetworkConfig } from '../lib/api/affiliate-network'

const config: NetworkConfig = {
  baseUrl: process.env.AFFILIATE_NETWORK_BASE_URL || 'https://login.affluentco.com/affiliates/api',
  affiliateId: process.env.AFFILIATE_NETWORK_AFFILIATE_ID || '208409',
  apiKey: process.env.AFFILIATE_NETWORK_API_KEY || 'Y0R1KxgxHpi2q88ZcYi7ag',
  name: 'Affluent'
}

async function compareStrategies() {
  const api = new AffiliateNetworkAPI(config)
  const startDate = '2025-09-01'
  const endDate = '2025-09-21'

  console.log('🧪 Testing Sampling Strategies')
  console.log('📅 Date Range:', { startDate, endDate })
  console.log('')

  // OLD STRATEGY: Gap-based sampling
  console.log('=== OLD STRATEGY: Gap-Based Sampling ===')
  const [oldBatch1, oldBatch2, oldBatch3] = await Promise.all([
    api.getConversions({ start_date: startDate, end_date: endDate, limit: 200, start_at_row: 1 }),
    api.getConversions({ start_date: startDate, end_date: endDate, limit: 200, start_at_row: 501 }),
    api.getConversions({ start_date: startDate, end_date: endDate, limit: 200, start_at_row: 1001 })
  ])

  const oldSubIds2 = new Set<string>()
  ;[oldBatch1, oldBatch2, oldBatch3].forEach(batch => {
    batch.data?.forEach(c => {
      if (c.subid_2) oldSubIds2.add(c.subid_2)
    })
  })

  console.log('Rows fetched: 1-200, 501-700, 1001-1200')
  console.log('Total records:',
    (oldBatch1.data?.length || 0) +
    (oldBatch2.data?.length || 0) +
    (oldBatch3.data?.length || 0)
  )
  console.log('Unique Sub ID 2s:', oldSubIds2.size)
  console.log('Values:', Array.from(oldSubIds2).sort())
  console.log('')

  // NEW STRATEGY: Sequential sampling
  console.log('=== NEW STRATEGY: Sequential Sampling ===')
  const [newBatch1, newBatch2, newBatch3] = await Promise.all([
    api.getConversions({ start_date: startDate, end_date: endDate, limit: 200, start_at_row: 1 }),
    api.getConversions({ start_date: startDate, end_date: endDate, limit: 200, start_at_row: 201 }),
    api.getConversions({ start_date: startDate, end_date: endDate, limit: 200, start_at_row: 401 })
  ])

  const newSubIds2 = new Set<string>()
  ;[newBatch1, newBatch2, newBatch3].forEach(batch => {
    batch.data?.forEach(c => {
      if (c.subid_2) newSubIds2.add(c.subid_2)
    })
  })

  console.log('Rows fetched: 1-200, 201-400, 401-600')
  console.log('Total records:',
    (newBatch1.data?.length || 0) +
    (newBatch2.data?.length || 0) +
    (newBatch3.data?.length || 0)
  )
  console.log('Unique Sub ID 2s:', newSubIds2.size)
  console.log('Values:', Array.from(newSubIds2).sort())
  console.log('')

  // COMPARISON
  console.log('=== COMPARISON ===')
  const missingInOld = Array.from(newSubIds2).filter(id => !oldSubIds2.has(id))
  const missingInNew = Array.from(oldSubIds2).filter(id => !newSubIds2.has(id))

  console.log(`Old strategy (gap-based): ${oldSubIds2.size} Sub IDs`)
  console.log(`New strategy (sequential): ${newSubIds2.size} Sub IDs`)
  console.log('')

  if (missingInOld.length > 0) {
    console.log('⚠️  Sub IDs MISSING in old strategy:', missingInOld)
    console.log('✅ New strategy FIXES the issue!')
  } else if (missingInNew.length > 0) {
    console.log('⚠️  Sub IDs MISSING in new strategy:', missingInNew)
    console.log('❌ New strategy is WORSE!')
  } else if (oldSubIds2.size === newSubIds2.size) {
    console.log('✅ Both strategies return SAME Sub IDs')
    console.log('💡 Issue may be API non-determinism, not sampling')
  }

  // Check gap ranges specifically
  console.log('')
  console.log('=== GAP ANALYSIS ===')
  console.log('Checking Sub IDs in gap ranges (rows 201-500, 701-1000)...')

  const gapRange1 = await api.getConversions({
    start_date: startDate,
    end_date: endDate,
    limit: 300,
    start_at_row: 201
  })

  const gapSubIds2 = new Set(gapRange1.data?.map(c => c.subid_2).filter(Boolean) || [])
  const uniqueToGap = Array.from(gapSubIds2).filter(id => !oldSubIds2.has(id))

  console.log(`Gap range 1 (rows 201-500): ${gapSubIds2.size} unique Sub IDs`)
  console.log(`Sub IDs ONLY in gap (missed by old strategy): [${uniqueToGap.join(', ') || 'none'}]`)

  if (uniqueToGap.length > 0) {
    console.log('')
    console.log('🎯 CONFIRMED: Gap-based sampling MISSES Sub IDs in gap ranges!')
    console.log('✅ Sequential sampling WILL FIX this issue.')
  }
}

compareStrategies().catch(console.error)
