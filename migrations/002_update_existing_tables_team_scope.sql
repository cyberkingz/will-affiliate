-- Migration: Update Existing Tables for Team Scope
-- Description: Adds team_id to existing tables and creates data migration strategy
-- Date: 2025-01-14

-- Update network_connections to be team-scoped
ALTER TABLE network_connections 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update campaigns_data to be team-scoped
ALTER TABLE campaigns_data 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Update ad_spend_entries to be team-scoped
ALTER TABLE ad_spend_entries 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Update sync_logs to be team-scoped
ALTER TABLE sync_logs 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add team_id to users table for default team
ALTER TABLE users 
ADD COLUMN default_team_id UUID REFERENCES teams(id),
ADD COLUMN onboarded_at TIMESTAMPTZ;

-- Create indexes for team-scoped queries
CREATE INDEX idx_network_connections_team_id ON network_connections(team_id);
CREATE INDEX idx_campaigns_data_team_id ON campaigns_data(team_id);
CREATE INDEX idx_ad_spend_entries_team_id ON ad_spend_entries(team_id);
CREATE INDEX idx_sync_logs_team_id ON sync_logs(team_id);

-- Update user_network_access to include team context
ALTER TABLE user_network_access 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX idx_user_network_access_team_id ON user_network_access(team_id);