-- Migration: Implement Team-Based RLS Policies
-- Description: Creates comprehensive Row Level Security policies for team-based multi-tenancy
-- Date: 2025-01-14

-- First, fix the critical security issue: Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all team tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's team memberships
CREATE OR REPLACE FUNCTION get_user_team_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(team_id) 
  FROM team_memberships 
  WHERE user_id = user_uuid AND is_active = TRUE;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Helper function to check if user has specific role in team
CREATE OR REPLACE FUNCTION user_has_team_role(team_uuid UUID, required_role team_role, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships 
    WHERE team_id = team_uuid 
    AND user_id = user_uuid 
    AND is_active = TRUE
    AND (
      role = required_role OR
      (required_role = 'viewer' AND role IN ('member', 'admin', 'owner')) OR
      (required_role = 'member' AND role IN ('admin', 'owner')) OR
      (required_role = 'admin' AND role = 'owner')
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Helper function to check if user is team member
CREATE OR REPLACE FUNCTION user_is_team_member(team_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships 
    WHERE team_id = team_uuid 
    AND user_id = user_uuid 
    AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ===== TEAMS POLICIES =====

-- Users can view teams they are members of
CREATE POLICY "Users can view own teams" ON teams
  FOR SELECT
  USING (id = ANY(get_user_team_ids()));

-- Team owners and admins can update team settings
CREATE POLICY "Team owners and admins can update teams" ON teams
  FOR UPDATE
  USING (user_has_team_role(id, 'admin'));

-- Users can create teams (they become the owner)
CREATE POLICY "Users can create teams" ON teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only team owners can delete teams
CREATE POLICY "Team owners can delete teams" ON teams
  FOR DELETE
  USING (user_has_team_role(id, 'owner'));

-- ===== TEAM MEMBERSHIPS POLICIES =====

-- Users can view memberships for teams they belong to
CREATE POLICY "Users can view team memberships" ON team_memberships
  FOR SELECT
  USING (user_is_team_member(team_id));

-- Team owners and admins can manage memberships
CREATE POLICY "Team owners and admins can manage memberships" ON team_memberships
  FOR ALL
  USING (user_has_team_role(team_id, 'admin'));

-- Users can update their own membership settings (not role)
CREATE POLICY "Users can update own membership" ON team_memberships
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role = (SELECT role FROM team_memberships WHERE user_id = auth.uid() AND team_id = team_memberships.team_id));

-- ===== TEAM INVITATIONS POLICIES =====

-- Team members can view invitations for their teams
CREATE POLICY "Team members can view invitations" ON team_invitations
  FOR SELECT
  USING (user_is_team_member(team_id));

-- Team owners and admins can manage invitations
CREATE POLICY "Team owners and admins can manage invitations" ON team_invitations
  FOR INSERT
  WITH CHECK (user_has_team_role(team_id, 'admin'));

CREATE POLICY "Team owners and admins can update invitations" ON team_invitations
  FOR UPDATE
  USING (user_has_team_role(team_id, 'admin'));

CREATE POLICY "Team owners and admins can delete invitations" ON team_invitations
  FOR DELETE
  USING (user_has_team_role(team_id, 'admin'));

-- Invited users can view and accept their own invitations
CREATE POLICY "Users can view own invitations" ON team_invitations
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can accept own invitations" ON team_invitations
  FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending');

-- ===== TEAM AUDIT LOGS POLICIES =====

-- Team members can view audit logs for their teams
CREATE POLICY "Team members can view audit logs" ON team_audit_logs
  FOR SELECT
  USING (user_is_team_member(team_id));

-- System and team admins can insert audit logs
CREATE POLICY "System can insert audit logs" ON team_audit_logs
  FOR INSERT
  WITH CHECK (true); -- Allow system inserts for audit logging

-- ===== UPDATE NETWORK CONNECTIONS POLICIES =====

-- Drop existing policies and create team-based ones
DROP POLICY IF EXISTS "Admins can manage network connections" ON network_connections;
DROP POLICY IF EXISTS "Staff can view accessible networks" ON network_connections;

-- Team members can view team's network connections
CREATE POLICY "Team members can view network connections" ON network_connections
  FOR SELECT
  USING (team_id IS NULL OR user_is_team_member(team_id));

-- Team admins can manage network connections
CREATE POLICY "Team admins can manage network connections" ON network_connections
  FOR ALL
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

-- ===== UPDATE CAMPAIGNS DATA POLICIES =====

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all campaigns data" ON campaigns_data;
DROP POLICY IF EXISTS "Users can view campaigns for accessible networks" ON campaigns_data;

-- Team members can view team's campaign data
CREATE POLICY "Team members can view campaigns data" ON campaigns_data
  FOR SELECT
  USING (
    team_id IS NULL OR 
    user_is_team_member(team_id) OR
    EXISTS (
      SELECT 1 FROM user_network_access una 
      WHERE una.network_connection_id = campaigns_data.network_connection_id 
      AND una.user_id = auth.uid()
    )
  );

-- Team members can insert campaign data
CREATE POLICY "Team members can insert campaigns data" ON campaigns_data
  FOR INSERT
  WITH CHECK (
    team_id IS NULL OR 
    user_is_team_member(team_id) OR
    EXISTS (
      SELECT 1 FROM user_network_access una 
      WHERE una.network_connection_id = campaigns_data.network_connection_id 
      AND una.user_id = auth.uid()
    )
  );

-- Team admins can manage campaign data
CREATE POLICY "Team admins can manage campaigns data" ON campaigns_data
  FOR UPDATE
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

CREATE POLICY "Team admins can delete campaigns data" ON campaigns_data
  FOR DELETE
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

-- ===== UPDATE AD SPEND ENTRIES POLICIES =====

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all ad spend entries" ON ad_spend_entries;
DROP POLICY IF EXISTS "Users can view ad spend for accessible networks" ON ad_spend_entries;
DROP POLICY IF EXISTS "Users can insert ad spend for accessible networks" ON ad_spend_entries;
DROP POLICY IF EXISTS "Users can update own ad spend entries" ON ad_spend_entries;

-- Team members can view team's ad spend entries
CREATE POLICY "Team members can view ad spend entries" ON ad_spend_entries
  FOR SELECT
  USING (
    team_id IS NULL OR 
    user_is_team_member(team_id) OR
    (network_connection_id IS NULL) OR 
    EXISTS (
      SELECT 1 FROM user_network_access una 
      WHERE una.network_connection_id = ad_spend_entries.network_connection_id 
      AND una.user_id = auth.uid()
    )
  );

-- Team members can insert ad spend entries
CREATE POLICY "Team members can insert ad spend entries" ON ad_spend_entries
  FOR INSERT
  WITH CHECK (
    team_id IS NULL OR 
    user_is_team_member(team_id) OR
    (network_connection_id IS NULL) OR 
    EXISTS (
      SELECT 1 FROM user_network_access una 
      WHERE una.network_connection_id = ad_spend_entries.network_connection_id 
      AND una.user_id = auth.uid()
    )
  );

-- Users can update their own ad spend entries
CREATE POLICY "Users can update own ad spend entries" ON ad_spend_entries
  FOR UPDATE
  USING (created_by = auth.uid());

-- Team admins can delete ad spend entries
CREATE POLICY "Team admins can delete ad spend entries" ON ad_spend_entries
  FOR DELETE
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

-- ===== UPDATE SYNC LOGS POLICIES =====

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Users can view sync logs for accessible networks" ON sync_logs;

-- Team members can view team's sync logs
CREATE POLICY "Team members can view sync logs" ON sync_logs
  FOR SELECT
  USING (
    team_id IS NULL OR 
    user_is_team_member(team_id) OR
    EXISTS (
      SELECT 1 FROM user_network_access una 
      WHERE una.network_connection_id = sync_logs.network_connection_id 
      AND una.user_id = auth.uid()
    )
  );

-- System can insert sync logs
CREATE POLICY "System can insert sync logs" ON sync_logs
  FOR INSERT
  WITH CHECK (true);

-- Team admins can manage sync logs
CREATE POLICY "Team admins can manage sync logs" ON sync_logs
  FOR UPDATE
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

CREATE POLICY "Team admins can delete sync logs" ON sync_logs
  FOR DELETE
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

-- ===== UPDATE USER NETWORK ACCESS POLICIES =====

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage user network access" ON user_network_access;
DROP POLICY IF EXISTS "Users can view own network access" ON user_network_access;

-- Team members can view network access for their teams
CREATE POLICY "Team members can view network access" ON user_network_access
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    (team_id IS NOT NULL AND user_is_team_member(team_id))
  );

-- Team admins can manage network access
CREATE POLICY "Team admins can manage network access" ON user_network_access
  FOR ALL
  USING (team_id IS NULL OR user_has_team_role(team_id, 'admin'));

-- ===== SECURITY IMPROVEMENTS =====

-- Update the trigger function with proper security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;