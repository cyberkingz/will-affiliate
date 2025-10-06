#!/usr/bin/env tsx
/**
 * Quick Sub ID 2 Investigation - Focused Test
 */

import { AffiliateNetworkAPI, NetworkConfig } from '../lib/api/affiliate-network'

const config: NetworkConfig = {
  baseUrl: process.env.AFFILIATE_NETWORK_BASE_URL || 'https://login.affluentco.com/affiliates/api',
  affiliateId: process.env.AFFILIATE_NETWORK_AFFILIATE_ID || '208409',
  apiKey: process.env.AFFILIATE_NETWORK_API_KEY || 'Y0R1KxgxHpi2q88ZcYi7ag',
  name: 'Affluent'
}

async function quickTest() {
  const api = new AffiliateNetworkAPI(config)
  const startDate = '2025-09-01'
  const endDate = '2025-09-21'

  console.log('🔍 Quick Sub ID 2 Test')
  console.log('📅 Date Range:', { startDate, endDate })
  console.log('')

  // Test: Production sampling strategy
  console.log('=== PRODUCTION SAMPLING STRATEGY ===')

  const [batch1, batch2, batch3] = await Promise.all([
    api.getConversions({
      start_date: startDate,
      end_date: endDate,
      limit: 200,
      start_at_row: 1
    }),
    api.getConversions({
      start_date: startDate,
      end_date: endDate,
      limit: 200,
      start_at_row: 501
    }),
    api.getConversions({
      start_date: startDate,
      end_date: endDate,
      limit: 200,
      start_at_row: 1001
    })
  ])

  const allSubIds2 = new Set<string>()

  console.log('\nBatch 1 (rows 1-200):')
  console.log('  Records:', batch1.data?.length || 0)
  const batch1SubIds2 = new Set(batch1.data?.map(c => c.subid_2).filter(Boolean) || [])
  console.log('  Sub ID 2s:', Array.from(batch1SubIds2).sort())
  batch1SubIds2.forEach(id => allSubIds2.add(id))

  console.log('\nBatch 2 (rows 501-700):')
  console.log('  Records:', batch2.data?.length || 0)
  const batch2SubIds2 = new Set(batch2.data?.map(c => c.subid_2).filter(Boolean) || [])
  console.log('  Sub ID 2s:', Array.from(batch2SubIds2).sort())
  batch2SubIds2.forEach(id => allSubIds2.add(id))

  console.log('\nBatch 3 (rows 1001-1200):')
  console.log('  Records:', batch3.data?.length || 0)
  const batch3SubIds2 = new Set(batch3.data?.map(c => c.subid_2).filter(Boolean) || [])
  console.log('  Sub ID 2s:', Array.from(batch3SubIds2).sort())
  batch3SubIds2.forEach(id => allSubIds2.add(id))

  console.log('\n📊 COMBINED RESULTS:')
  console.log(`Total unique Sub ID 2s: ${allSubIds2.size}`)
  console.log(`Values: [${Array.from(allSubIds2).sort().join(', ')}]`)

  // Now test first 600 sequential
  console.log('\n\n=== ALTERNATIVE: FIRST 600 SEQUENTIAL ===')

  const sequential = await api.getConversions({
    start_date: startDate,
    end_date: endDate,
    limit: 600,
    start_at_row: 1
  })

  const seqSubIds2 = new Set(sequential.data?.map(c => c.subid_2).filter(Boolean) || [])
  console.log('Records:', sequential.data?.length || 0)
  console.log('Sub ID 2s:', Array.from(seqSubIds2).sort())
  console.log('Count:', seqSubIds2.size)

  // Compare
  console.log('\n\n=== COMPARISON ===')
  console.log(`Production sampling: ${allSubIds2.size} Sub IDs`)
  console.log(`Sequential 600: ${seqSubIds2.size} Sub IDs`)

  const missingInProd = Array.from(seqSubIds2).filter(id => !allSubIds2.has(id))
  const missingInSeq = Array.from(allSubIds2).filter(id => !seqSubIds2.has(id))

  console.log(`Missing in production: [${missingInProd.join(', ') || 'none'}]`)
  console.log(`Missing in sequential: [${missingInSeq.join(', ') || 'none'}]`)
}

quickTest().catch(console.error)
