# Campaigns Insight Database Schema Setup

This document contains the complete database schema for the Campaigns Insight application built on Supabase.

## Files Created

1. **`supabase_campaigns_insight_schema.sql`** - Complete SQL schema with tables, indexes, RLS policies, and functions
2. **`types/supabase.ts`** - TypeScript type definitions for the database schema

## Schema Overview

The schema includes the following core components:

### Core Tables

1. **`users`** - Extends Supabase auth.users with application-specific fields
2. **`network_connections`** - Affiliate network configurations and API credentials
3. **`user_network_access`** - Junction table for user permissions to networks
4. **`campaigns_data`** - Campaign performance data from affiliate networks
5. **`ad_spend_entries`** - User-entered ad spend data for ROAS calculations
6. **`sync_logs`** - Logging for data synchronization processes

### Key Features

- **Multi-tenant Architecture**: Role-based access (admin/staff) with network-level permissions
- **Row Level Security (RLS)**: Comprehensive security policies ensuring data isolation
- **Performance Optimized**: Strategic indexes for time-series queries
- **Calculated Metrics**: Functions for CVR, EPC, ROAS calculations
- **Audit Trail**: Complete tracking of data changes and sync operations

## Setup Instructions

### 1. Apply the Schema

You can apply the schema in several ways:

#### Option A: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase_campaigns_insight_schema.sql`
4. Execute the script

#### Option B: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset
# Then paste the schema into your migration files
```

#### Option C: Direct psql Connection
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f supabase_campaigns_insight_schema.sql
```

### 2. Create Your First Admin User

After applying the schema, you'll need to:

1. Sign up a user through your application or Supabase Auth
2. Get the user's UUID from the `auth.users` table
3. Insert them into the `public.users` table as an admin:

```sql
INSERT INTO public.users (id, email, full_name, role) 
VALUES ('[USER-UUID-FROM-AUTH]', 'admin@yourcompany.com', 'Admin User', 'admin');
```

### 3. Set Up Network Connections

Create your first affiliate network connection:

```sql
INSERT INTO public.network_connections (name, network_type, affiliate_id, api_key, is_active)
VALUES ('My Affiliate Network', 'affluent', 'AFF123', 'encrypted_api_key', true);
```

### 4. Grant Network Access to Users

Allow users to access specific networks:

```sql
INSERT INTO public.user_network_access (user_id, network_connection_id, granted_by)
VALUES ('[USER-UUID]', '[NETWORK-UUID]', '[ADMIN-USER-UUID]');
```

## Database Functions

### `get_user_accessible_networks(user_id)`
Returns all networks a user has access to.

```sql
SELECT * FROM get_user_accessible_networks('user-uuid-here');
```

### `calculate_campaign_metrics(network_id, campaign_id?, start_date?, end_date?)`
Calculates comprehensive campaign metrics including CVR, EPC, ROAS, and profit.

```sql
SELECT * FROM calculate_campaign_metrics(
    'network-uuid-here',
    'campaign-123',
    '2024-01-01'::date,
    '2024-01-31'::date
);
```

## Views

### `campaign_performance_view`
Pre-calculated view combining campaigns data with ad spend and metrics:

```sql
SELECT * FROM campaign_performance_view 
WHERE network_connection_id = 'network-uuid'
AND day >= '2024-01-01'
ORDER BY day DESC;
```

## Security Model

### Role-Based Access Control

- **Admin**: Full access to all data, can manage users and networks
- **Staff**: Access only to networks they've been granted permission to

### Row Level Security Policies

All tables have RLS enabled with policies ensuring:
- Users can only see data for networks they have access to
- Only admins can create/modify network connections
- Users can only modify their own ad spend entries
- Complete audit trail for all changes

## Frontend Integration

### TypeScript Types

Import the generated types in your frontend application:

```typescript
import { Database } from './types/supabase'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Example Queries

```typescript
// Get user's accessible networks
const { data: networks } = await supabase
  .rpc('get_user_accessible_networks', { target_user_id: user.id })

// Get campaign performance data
const { data: campaigns } = await supabase
  .from('campaign_performance_view')
  .select('*')
  .eq('network_connection_id', networkId)
  .gte('day', startDate)
  .lte('day', endDate)
  .order('day', { ascending: false })

// Add ad spend entry
const { error } = await supabase
  .from('ad_spend_entries')
  .insert({
    network_connection_id: networkId,
    campaign_id: campaignId,
    day: date,
    amount: spendAmount,
    created_by: user.id
  })
```

## Performance Considerations

### Indexes

The schema includes strategic indexes for:
- Time-series queries on campaign data
- Network-based filtering
- User access lookups
- Campaign and sub-ID filtering

### Partitioning (Future Enhancement)

For large datasets, consider partitioning the `campaigns_data` table by date:

```sql
-- Example partitioning by month (implement when needed)
CREATE TABLE campaigns_data_y2024m01 PARTITION OF campaigns_data
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Data Synchronization

The schema supports automated data synchronization with:
- `sync_logs` table for tracking sync operations
- Status tracking for each network connection
- Error logging and retry mechanisms
- Incremental sync support with `last_sync_at` timestamps

## Backup and Maintenance

### Regular Maintenance Tasks

1. **Clean up old sync logs**: Archive logs older than 30 days
2. **Analyze query performance**: Monitor slow queries and optimize indexes
3. **Update statistics**: Run `ANALYZE` on large tables regularly
4. **Monitor storage**: Archive old campaign data as needed

### Data Retention

Consider implementing data retention policies:
- Keep detailed data for 2 years
- Archive older data to separate tables
- Maintain aggregated summaries for historical reporting

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure users have proper network access grants
2. **Performance Issues**: Check query execution plans and index usage
3. **Sync Failures**: Monitor `sync_logs` for error patterns
4. **Data Inconsistencies**: Validate foreign key relationships

### Monitoring Queries

```sql
-- Check active sync operations
SELECT * FROM sync_logs WHERE status = 'running';

-- Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

## Next Steps

1. Apply the schema to your Supabase project
2. Set up your first admin user
3. Configure network connections
4. Implement data synchronization logic
5. Build frontend components using the provided TypeScript types
6. Set up monitoring and alerting for sync operations

For questions or issues, refer to the Supabase documentation or create an issue in your project repository.