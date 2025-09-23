-- Migration: Create Team Management Schema
-- Description: Implements comprehensive team management system with roles, invitations, and audit logging
-- Date: 2025-01-14

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums for team roles and invitation statuses
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE audit_action AS ENUM (
  'user_invited', 'user_joined', 'user_removed', 'role_changed',
  'network_added', 'network_removed', 'team_settings_updated',
  'campaign_created', 'campaign_updated', 'campaign_deleted'
);

-- Teams table - core team management
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  slug TEXT UNIQUE NOT NULL CHECK (length(slug) >= 2 AND length(slug) <= 50 AND slug ~ '^[a-z0-9-]+$'),
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  billing_email TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'incomplete')),
  subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team memberships - links users to teams with roles
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  permissions JSONB DEFAULT '{}', -- Additional granular permissions
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations - manage pending invitations
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email, status) -- Prevent duplicate pending invitations
);

-- Team audit logs - track all team activities
CREATE TABLE team_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id), -- NULL for system actions
  action audit_action NOT NULL,
  resource_type TEXT, -- 'user', 'network', 'campaign', etc.
  resource_id TEXT, -- ID of the affected resource
  details JSONB DEFAULT '{}', -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_active ON team_memberships(team_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status, expires_at);
CREATE INDEX idx_team_audit_logs_team_id ON team_audit_logs(team_id);
CREATE INDEX idx_team_audit_logs_created_at ON team_audit_logs(created_at);

-- Create updated_at triggers
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER team_memberships_updated_at BEFORE UPDATE ON team_memberships 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER team_invitations_updated_at BEFORE UPDATE ON team_invitations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();