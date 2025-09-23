-- Migration: Sample Queries and Helper Functions
-- Description: Provides commonly used queries and helper functions for team management
-- Date: 2025-01-14

-- ===== HELPER FUNCTIONS =====

-- Function to get teams for a user with their role
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_description TEXT,
  user_role team_role,
  joined_at TIMESTAMPTZ,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.description,
    tm.role,
    tm.joined_at,
    (
      SELECT COUNT(*) 
      FROM team_memberships tm2 
      WHERE tm2.team_id = t.id AND tm2.is_active = TRUE
    ) as member_count
  FROM teams t
  JOIN team_memberships tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid 
  AND tm.is_active = TRUE
  ORDER BY tm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get team members with details
CREATE OR REPLACE FUNCTION get_team_members(team_uuid UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role team_role,
  joined_at TIMESTAMPTZ,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if caller has access to this team
  IF NOT user_is_team_member(team_uuid) THEN
    RAISE EXCEPTION 'Access denied to team members';
  END IF;

  RETURN QUERY
  SELECT 
    tm.id,
    tm.user_id,
    u.email,
    u.full_name,
    tm.role,
    tm.joined_at,
    au.last_sign_in_at
  FROM team_memberships tm
  JOIN users u ON tm.user_id = u.id
  JOIN auth.users au ON u.id = au.id
  WHERE tm.team_id = team_uuid 
  AND tm.is_active = TRUE
  ORDER BY 
    CASE tm.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'member' THEN 3
      WHEN 'viewer' THEN 4
    END,
    tm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get team statistics
CREATE OR REPLACE FUNCTION get_team_stats(team_uuid UUID)
RETURNS TABLE (
  total_members BIGINT,
  total_networks BIGINT,
  total_campaigns BIGINT,
  total_revenue NUMERIC,
  last_30_days_revenue NUMERIC
) AS $$
BEGIN
  -- Check if caller has access to this team
  IF NOT user_is_team_member(team_uuid) THEN
    RAISE EXCEPTION 'Access denied to team statistics';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM team_memberships WHERE team_id = team_uuid AND is_active = TRUE),
    (SELECT COUNT(*) FROM network_connections WHERE team_id = team_uuid AND is_active = TRUE),
    (SELECT COUNT(DISTINCT campaign_id) FROM campaigns_data WHERE team_id = team_uuid),
    (SELECT COALESCE(SUM(revenue), 0) FROM campaigns_data WHERE team_id = team_uuid),
    (SELECT COALESCE(SUM(revenue), 0) FROM campaigns_data 
     WHERE team_id = team_uuid AND day >= CURRENT_DATE - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE team_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===== VIEWS FOR COMMON QUERIES =====

-- View for campaign performance by team
CREATE OR REPLACE VIEW team_campaign_performance AS
SELECT 
  cd.team_id,
  cd.campaign_id,
  cd.campaign_name,
  cd.offer_id,
  SUM(cd.clicks) as total_clicks,
  SUM(cd.conversions) as total_conversions,
  SUM(cd.revenue) as total_revenue,
  SUM(cd.payout) as total_payout,
  CASE 
    WHEN SUM(cd.clicks) > 0 
    THEN (SUM(cd.conversions)::DECIMAL / SUM(cd.clicks)) * 100 
    ELSE 0 
  END as conversion_rate,
  CASE 
    WHEN SUM(cd.conversions) > 0 
    THEN SUM(cd.revenue) / SUM(cd.conversions) 
    ELSE 0 
  END as revenue_per_conversion,
  MIN(cd.day) as first_day,
  MAX(cd.day) as last_day
FROM campaigns_data cd
WHERE cd.team_id IS NOT NULL
GROUP BY cd.team_id, cd.campaign_id, cd.campaign_name, cd.offer_id;

-- View for team network summary
CREATE OR REPLACE VIEW team_network_summary AS
SELECT 
  nc.team_id,
  nc.network_type,
  COUNT(*) as connection_count,
  COUNT(CASE WHEN nc.is_active THEN 1 END) as active_connections,
  MAX(nc.last_sync_at) as last_sync_at,
  COUNT(CASE WHEN nc.last_sync_status = 'success' THEN 1 END) as successful_syncs
FROM network_connections nc
WHERE nc.team_id IS NOT NULL
GROUP BY nc.team_id, nc.network_type;

-- ===== SAMPLE QUERIES =====

/*
-- Get all teams for the current user
SELECT * FROM get_user_teams();

-- Get members of a specific team
SELECT * FROM get_team_members('team-uuid-here');

-- Get team statistics
SELECT * FROM get_team_stats('team-uuid-here');

-- Get team's campaign performance
SELECT * FROM team_campaign_performance WHERE team_id = 'team-uuid-here';

-- Get team's network connections summary
SELECT * FROM team_network_summary WHERE team_id = 'team-uuid-here';

-- Get pending invitations for a team
SELECT 
  ti.id,
  ti.email,
  ti.role,
  ti.expires_at,
  ti.created_at,
  u.full_name as invited_by_name
FROM team_invitations ti
JOIN users u ON ti.invited_by = u.id
WHERE ti.team_id = 'team-uuid-here' 
AND ti.status = 'pending'
ORDER BY ti.created_at DESC;

-- Get recent team activity
SELECT 
  tal.created_at,
  tal.action,
  tal.resource_type,
  tal.details,
  u.full_name as actor_name
FROM team_audit_logs tal
LEFT JOIN users u ON tal.actor_id = u.id
WHERE tal.team_id = 'team-uuid-here'
ORDER BY tal.created_at DESC
LIMIT 50;

-- Get team revenue trends (last 30 days)
SELECT 
  cd.day,
  SUM(cd.revenue) as daily_revenue,
  SUM(cd.clicks) as daily_clicks,
  SUM(cd.conversions) as daily_conversions
FROM campaigns_data cd
WHERE cd.team_id = 'team-uuid-here'
AND cd.day >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cd.day
ORDER BY cd.day;

-- Get top performing campaigns for a team
SELECT 
  campaign_id,
  campaign_name,
  total_revenue,
  total_conversions,
  conversion_rate,
  revenue_per_conversion
FROM team_campaign_performance 
WHERE team_id = 'team-uuid-here'
ORDER BY total_revenue DESC
LIMIT 10;

-- Check user permissions for a specific team
SELECT 
  tm.role,
  tm.permissions,
  tm.joined_at,
  tm.is_active
FROM team_memberships tm
WHERE tm.team_id = 'team-uuid-here'
AND tm.user_id = auth.uid();
*/