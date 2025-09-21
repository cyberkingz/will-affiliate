-- ================================================================
-- Campaigns Insight Application - Complete Database Schema
-- ================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CORE TABLES
-- ================================================================

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text NOT NULL,
    full_name text,
    role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    timezone text NOT NULL DEFAULT 'UTC',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create network_connections table
CREATE TABLE public.network_connections (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    network_type text NOT NULL,
    affiliate_id text,
    api_key text, -- Will be encrypted at application level
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    last_sync_status text CHECK (last_sync_status IN ('success', 'error', 'pending')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_network_access table (junction table)
CREATE TABLE public.user_network_access (
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    network_connection_id uuid REFERENCES public.network_connections(id) ON DELETE CASCADE,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    granted_by uuid REFERENCES public.users(id),
    PRIMARY KEY (user_id, network_connection_id)
);

-- Create campaigns_data table
CREATE TABLE public.campaigns_data (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    network_connection_id uuid REFERENCES public.network_connections(id) ON DELETE CASCADE NOT NULL,
    campaign_id text NOT NULL,
    campaign_name text,
    offer_id text,
    day date NOT NULL,
    sub_id text,
    sub2 text,
    sub3 text,
    clicks integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    revenue decimal(15,2) DEFAULT 0 NOT NULL,
    payout decimal(15,2),
    impressions integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (network_connection_id, campaign_id, day, sub_id)
);

-- Create ad_spend_entries table
CREATE TABLE public.ad_spend_entries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    network_connection_id uuid REFERENCES public.network_connections(id) ON DELETE SET NULL,
    campaign_id text,
    sub_id text,
    day date NOT NULL,
    amount decimal(15,2) NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    created_by uuid REFERENCES public.users(id) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create sync_logs table
CREATE TABLE public.sync_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    network_connection_id uuid REFERENCES public.network_connections(id) ON DELETE CASCADE NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')) NOT NULL,
    records_synced integer DEFAULT 0,
    error_message text,
    created_by uuid REFERENCES public.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- campaigns_data indexes
CREATE INDEX idx_campaigns_data_network_day ON public.campaigns_data(network_connection_id, day);
CREATE INDEX idx_campaigns_data_network_campaign_day ON public.campaigns_data(network_connection_id, campaign_id, day);
CREATE INDEX idx_campaigns_data_network_sub_day ON public.campaigns_data(network_connection_id, sub_id, day);
CREATE INDEX idx_campaigns_data_day ON public.campaigns_data(day);

-- ad_spend_entries indexes
CREATE INDEX idx_ad_spend_network_day ON public.ad_spend_entries(network_connection_id, day);
CREATE INDEX idx_ad_spend_campaign_day ON public.ad_spend_entries(campaign_id, day);
CREATE INDEX idx_ad_spend_created_by ON public.ad_spend_entries(created_by);

-- user_network_access indexes
CREATE INDEX idx_user_network_access_user ON public.user_network_access(user_id);
CREATE INDEX idx_user_network_access_network ON public.user_network_access(network_connection_id);

-- sync_logs indexes
CREATE INDEX idx_sync_logs_network ON public.sync_logs(network_connection_id);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON public.sync_logs(started_at);

-- ================================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_network_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_spend_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Network connections policies
CREATE POLICY "Admins can manage network connections" ON public.network_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Staff can view accessible networks" ON public.network_connections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_network_access una
            WHERE una.network_connection_id = id 
            AND una.user_id = auth.uid()
        )
    );

-- User network access policies
CREATE POLICY "Admins can manage user network access" ON public.user_network_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view own network access" ON public.user_network_access
    FOR SELECT USING (user_id = auth.uid());

-- Campaigns data policies
CREATE POLICY "Users can view campaigns for accessible networks" ON public.campaigns_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_network_access una
            WHERE una.network_connection_id = campaigns_data.network_connection_id 
            AND una.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all campaigns data" ON public.campaigns_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Ad spend entries policies
CREATE POLICY "Users can view ad spend for accessible networks" ON public.ad_spend_entries
    FOR SELECT USING (
        network_connection_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.user_network_access una
            WHERE una.network_connection_id = ad_spend_entries.network_connection_id 
            AND una.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ad spend for accessible networks" ON public.ad_spend_entries
    FOR INSERT WITH CHECK (
        network_connection_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.user_network_access una
            WHERE una.network_connection_id = ad_spend_entries.network_connection_id 
            AND una.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own ad spend entries" ON public.ad_spend_entries
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all ad spend entries" ON public.ad_spend_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Sync logs policies
CREATE POLICY "Users can view sync logs for accessible networks" ON public.sync_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_network_access una
            WHERE una.network_connection_id = sync_logs.network_connection_id 
            AND una.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all sync logs" ON public.sync_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to get user's accessible networks
CREATE OR REPLACE FUNCTION get_user_accessible_networks(target_user_id uuid)
RETURNS TABLE(
    network_id uuid,
    network_name text,
    network_type text,
    is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        nc.id,
        nc.name,
        nc.network_type,
        nc.is_active
    FROM public.network_connections nc
    INNER JOIN public.user_network_access una ON nc.id = una.network_connection_id
    WHERE una.user_id = target_user_id
    AND nc.is_active = true
    ORDER BY nc.name;
$$;

-- Function to calculate campaign metrics
CREATE OR REPLACE FUNCTION calculate_campaign_metrics(
    p_network_connection_id uuid,
    p_campaign_id text DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS TABLE(
    campaign_id text,
    campaign_name text,
    total_clicks bigint,
    total_conversions bigint,
    total_revenue numeric,
    total_spend numeric,
    cvr numeric,
    epc numeric,
    roas numeric,
    profit numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH campaign_stats AS (
        SELECT 
            cd.campaign_id,
            cd.campaign_name,
            SUM(cd.clicks) as total_clicks,
            SUM(cd.conversions) as total_conversions,
            SUM(cd.revenue) as total_revenue
        FROM public.campaigns_data cd
        WHERE cd.network_connection_id = p_network_connection_id
        AND (p_campaign_id IS NULL OR cd.campaign_id = p_campaign_id)
        AND (p_start_date IS NULL OR cd.day >= p_start_date)
        AND (p_end_date IS NULL OR cd.day <= p_end_date)
        GROUP BY cd.campaign_id, cd.campaign_name
    ),
    spend_stats AS (
        SELECT 
            ase.campaign_id,
            SUM(ase.amount) as total_spend
        FROM public.ad_spend_entries ase
        WHERE ase.network_connection_id = p_network_connection_id
        AND (p_campaign_id IS NULL OR ase.campaign_id = p_campaign_id)
        AND (p_start_date IS NULL OR ase.day >= p_start_date)
        AND (p_end_date IS NULL OR ase.day <= p_end_date)
        GROUP BY ase.campaign_id
    )
    SELECT 
        cs.campaign_id,
        cs.campaign_name,
        cs.total_clicks,
        cs.total_conversions,
        cs.total_revenue,
        COALESCE(ss.total_spend, 0) as total_spend,
        CASE 
            WHEN cs.total_clicks > 0 THEN 
                ROUND((cs.total_conversions::numeric / cs.total_clicks::numeric) * 100, 2)
            ELSE 0 
        END as cvr,
        CASE 
            WHEN cs.total_clicks > 0 THEN 
                ROUND(cs.total_revenue / cs.total_clicks, 4)
            ELSE 0 
        END as epc,
        CASE 
            WHEN COALESCE(ss.total_spend, 0) > 0 THEN 
                ROUND(cs.total_revenue / ss.total_spend, 2)
            ELSE 0 
        END as roas,
        cs.total_revenue - COALESCE(ss.total_spend, 0) as profit
    FROM campaign_stats cs
    LEFT JOIN spend_stats ss ON cs.campaign_id = ss.campaign_id
    ORDER BY cs.total_revenue DESC;
$$;

-- ================================================================
-- VIEWS FOR ANALYTICS
-- ================================================================

-- Campaign performance view with calculated metrics
CREATE VIEW campaign_performance_view AS
SELECT 
    cd.network_connection_id,
    nc.name as network_name,
    cd.campaign_id,
    cd.campaign_name,
    cd.day,
    cd.clicks,
    cd.conversions,
    cd.revenue,
    cd.payout,
    cd.impressions,
    COALESCE(ase.amount, 0) as ad_spend,
    CASE 
        WHEN cd.clicks > 0 THEN 
            ROUND((cd.conversions::numeric / cd.clicks::numeric) * 100, 2)
        ELSE 0 
    END as cvr,
    CASE 
        WHEN cd.clicks > 0 THEN 
            ROUND(cd.revenue / cd.clicks, 4)
        ELSE 0 
    END as epc,
    CASE 
        WHEN COALESCE(ase.amount, 0) > 0 THEN 
            ROUND(cd.revenue / ase.amount, 2)
        ELSE 0 
    END as roas,
    cd.revenue - COALESCE(ase.amount, 0) as profit
FROM public.campaigns_data cd
LEFT JOIN public.network_connections nc ON cd.network_connection_id = nc.id
LEFT JOIN public.ad_spend_entries ase ON 
    cd.network_connection_id = ase.network_connection_id 
    AND cd.campaign_id = ase.campaign_id 
    AND cd.day = ase.day
    AND COALESCE(cd.sub_id, '') = COALESCE(ase.sub_id, '');

-- ================================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_connections_updated_at BEFORE UPDATE ON public.network_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_data_updated_at BEFORE UPDATE ON public.campaigns_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_spend_entries_updated_at BEFORE UPDATE ON public.ad_spend_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ================================================================
-- SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ================================================================

-- Insert sample admin user (you'll need to update the UUID with actual auth.users id)
-- INSERT INTO public.users (id, email, full_name, role) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin User', 'admin');

-- Insert sample network connection
-- INSERT INTO public.network_connections (name, network_type, affiliate_id, is_active)
-- VALUES ('Sample Network', 'affluent', 'AFF123', true);

-- ================================================================
-- COMPLETION MESSAGE
-- ================================================================

-- Schema creation completed successfully!
-- Next steps:
-- 1. Update the sample admin user UUID with your actual auth.users ID
-- 2. Create your first network connections
-- 3. Grant users access to networks
-- 4. Start importing campaign data