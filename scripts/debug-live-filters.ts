#!/usr/bin/env tsx
/**
 * Debug Script: Live Filters API Investigation
 *
 * Purpose: Determine why Sub ID 2 dropdown is incomplete on first load
 *
 * This script will:
 * 1. Make multiple calls to the Affluent API with same parameters
 * 2. Compare responses to check for non-determinism
 * 3. Analyze Sub ID distribution across different row ranges
 * 4. Identify optimal sampling strategy
 */

import { AffiliateNetworkAPI, NetworkConfig } from '../lib/api/affiliate-network'

const config: NetworkConfig = {
  baseUrl: process.env.AFFILIATE_NETWORK_BASE_URL || 'https://login.affluentco.com/affiliates/api',
  affiliateId: process.env.AFFILIATE_NETWORK_AFFILIATE_ID || '208409',
  apiKey: process.env.AFFILIATE_NETWORK_API_KEY || 'Y0R1KxgxHpi2q88ZcYi7ag',
  name: 'Affluent'
}

async function investigateSubId2Issue() {
  const api = new AffiliateNetworkAPI(config)

  // Use the same date range as the issue
  const startDate = '2025-09-01'
  const endDate = '2025-09-21'

  console.log('🔍 Starting Sub ID 2 Investigation...')
  console.log('📅 Date Range:', { startDate, endDate })
  console.log('')

  // Test 1: Check if API returns same results for identical queries
  console.log('=== TEST 1: API Determinism Check ===')
  console.log('Making 3 identical requests to check for randomness...')

  const batch1a = await api.getConversions({
    start_date: startDate,
    end_date: endDate,
    limit: 200,
    start_at_row: 1
  })

  await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay

  const batch1b = await api.getConversions({
    start_date: startDate,
    end_date: endDate,
    limit: 200,
    start_at_row: 1
  })

  await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay

  const batch1c = await api.getConversions({
    start_date: startDate,
    end_date: endDate,
    limit: 200,
    start_at_row: 1
  })

  const subIds2_1a = new Set(batch1a.data?.map(c => c.subid_2).filter(Boolean) || [])
  const subIds2_1b = new Set(batch1b.data?.map(c => c.subid_2).filter(Boolean) || [])
  const subIds2_1c = new Set(batch1c.data?.map(c => c.subid_2).filter(Boolean) || [])

  console.log('Request 1 Sub IDs:', Array.from(subIds2_1a).sort())
  console.log('Request 2 Sub IDs:', Array.from(subIds2_1b).sort())
  console.log('Request 3 Sub IDs:', Array.from(subIds2_1c).sort())

  const deterministic =
    JSON.stringify(Array.from(subIds2_1a).sort()) === JSON.stringify(Array.from(subIds2_1b).sort()) &&
    JSON.stringify(Array.from(subIds2_1b).sort()) === JSON.stringify(Array.from(subIds2_1c).sort())

  console.log('✅ API is deterministic:', deterministic)
  console.log('')

  // Test 2: Analyze Sub ID distribution across row ranges
  console.log('=== TEST 2: Sub ID Distribution Analysis ===')
  console.log('Fetching conversions from multiple row ranges...')

  const ranges = [
    { start: 1, limit: 200, label: 'Batch 1 (rows 1-200)' },
    { start: 201, limit: 200, label: 'Batch 2 (rows 201-400)' },
    { start: 401, limit: 200, label: 'Batch 3 (rows 401-600)' },
    { start: 501, limit: 200, label: 'Batch 4 (rows 501-700)' },
    { start: 701, limit: 200, label: 'Batch 5 (rows 701-900)' },
    { start: 901, limit: 200, label: 'Batch 6 (rows 901-1100)' },
    { start: 1001, limit: 200, label: 'Batch 7 (rows 1001-1200)' },
  ]

  const allSubIds2 = new Set<string>()

  for (const range of ranges) {
    const response = await api.getConversions({
      start_date: startDate,
      end_date: endDate,
      limit: range.limit,
      start_at_row: range.start
    })

    const subIds2 = new Set(response.data?.map(c => c.subid_2).filter(Boolean) || [])

    console.log(`\n${range.label}:`)
    console.log(`  Records returned: ${response.data?.length || 0}`)
    console.log(`  Unique Sub ID 2s: ${subIds2.size}`)
    console.log(`  Sub ID 2 values: [${Array.from(subIds2).sort().join(', ')}]`)

    // Add to global set
    subIds2.forEach(id => allSubIds2.add(id))

    await new Promise(resolve => setTimeout(resolve, 500)) // Rate limiting
  }

  console.log('\n📊 AGGREGATED RESULTS:')
  console.log(`Total unique Sub ID 2s found: ${allSubIds2.size}`)
  console.log(`All Sub ID 2 values: [${Array.from(allSubIds2).sort().join(', ')}]`)
  console.log('')

  // Test 3: Current sampling strategy (what's in production)
  console.log('=== TEST 3: Current Sampling Strategy ===')
  console.log('Simulating production sampling (rows 1-200, 501-700, 1001-1200)...')

  const [prod1, prod2, prod3] = await Promise.all([
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

  const prodSubIds2 = new Set<string>()
  const allProdData = [...(prod1.data || []), ...(prod2.data || []), ...(prod3.data || [])]

  allProdData.forEach(c => {
    if (c.subid_2) prodSubIds2.add(c.subid_2)
  })

  console.log(`Production sampling captures ${prodSubIds2.size} Sub ID 2s: [${Array.from(prodSubIds2).sort().join(', ')}]`)
  console.log('')

  // Test 4: Check if clicks data has different Sub IDs
  console.log('=== TEST 4: Clicks Data Analysis ===')
  console.log('Checking if clicks contain Sub IDs missing from conversions...')

  const clicksResponse = await api.getClicks({
    start_date: startDate,
    end_date: endDate,
    include_duplicates: true,
    row_limit: 100,
    start_at_row: 1
  })

  const clicksSubIds2 = new Set(clicksResponse.data?.map(c => c.subid_2).filter(Boolean) || [])

  console.log(`Clicks contain ${clicksSubIds2.size} unique Sub ID 2s: [${Array.from(clicksSubIds2).sort().join(', ')}]`)

  const missingFromConversions = Array.from(clicksSubIds2).filter(id => !allSubIds2.has(id))
  const missingFromClicks = Array.from(allSubIds2).filter(id => !clicksSubIds2.has(id))

  console.log(`Sub IDs in clicks but not conversions: [${missingFromConversions.join(', ') || 'none'}]`)
  console.log(`Sub IDs in conversions but not clicks: [${missingFromClicks.join(', ') || 'none'}]`)
  console.log('')

  // Test 5: Recommend optimal strategy
  console.log('=== RECOMMENDATIONS ===')

  const coverage = (prodSubIds2.size / allSubIds2.size) * 100
  console.log(`Current sampling captures ${coverage.toFixed(1)}% of all Sub IDs`)

  if (coverage < 100) {
    console.log('⚠️ Current sampling is INCOMPLETE')
    console.log('Recommendations:')
    console.log('  1. Increase sample size or fetch more batches')
    console.log('  2. Consider sequential batches instead of gaps (1-200, 201-400, 401-600)')
    console.log('  3. Fetch ALL conversions if dataset is small enough')
    console.log('  4. Consider using clicks data as primary source (may have better Sub ID coverage)')
  } else {
    console.log('✅ Current sampling captures all Sub IDs')
    console.log('Issue may be related to:')
    console.log('  1. Caching (check cache key generation)')
    console.log('  2. Race conditions in parallel requests')
    console.log('  3. Frontend state management')
  }

  console.log('')
  console.log('🏁 Investigation complete!')
}

investigateSubId2Issue().catch(console.error)
