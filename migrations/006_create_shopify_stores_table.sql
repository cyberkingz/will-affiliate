-- Migration: Create shopify_stores table for Shopify store management
-- Created: 2025-01-26
-- Description: Creates shopify_stores table with RLS policies, constraints, and indexes

-- Create status enum type
CREATE TYPE store_status AS ENUM ('active', 'inactive');

-- Create shopify_stores table
CREATE TABLE shopify_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name VARCHAR(100) NOT NULL,
    store_url VARCHAR NOT NULL,
    shopify_email VARCHAR NOT NULL,
    shopify_password VARCHAR NOT NULL,
    status store_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraints
ALTER TABLE shopify_stores 
ADD CONSTRAINT check_store_url_format 
CHECK (store_url ILIKE '%shopify.com%' OR store_url ILIKE '%.myshopify.com%');

ALTER TABLE shopify_stores 
ADD CONSTRAINT check_shopify_email_format 
CHECK (shopify_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add composite unique constraint for user_id + store_url
ALTER TABLE shopify_stores 
ADD CONSTRAINT unique_user_store_url UNIQUE (user_id, store_url);

-- Create indexes for performance
CREATE INDEX idx_shopify_stores_user_id ON shopify_stores(user_id);
CREATE INDEX idx_shopify_stores_status ON shopify_stores(status);
CREATE INDEX idx_shopify_stores_created_at ON shopify_stores(created_at DESC);
CREATE INDEX idx_shopify_stores_user_status ON shopify_stores(user_id, status);

-- Create function to update updated_at timestamp (reusable for other tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_shopify_stores_updated_at
    BEFORE UPDATE ON shopify_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to only access their own stores
CREATE POLICY "Users can only access their own Shopify stores"
ON shopify_stores
FOR ALL
USING (auth.uid() = user_id);

-- Create policy for authenticated users to insert their own stores
CREATE POLICY "Users can insert their own Shopify stores"
ON shopify_stores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add table and column comments for documentation
COMMENT ON TABLE shopify_stores IS 'Stores Shopify store credentials and configuration for users';
COMMENT ON COLUMN shopify_stores.id IS 'Primary key UUID';
COMMENT ON COLUMN shopify_stores.user_id IS 'References auth.users.id - the owner of this store';
COMMENT ON COLUMN shopify_stores.store_name IS 'Display name for the Shopify store (max 100 chars)';
COMMENT ON COLUMN shopify_stores.store_url IS 'Shopify store URL - must contain shopify.com or .myshopify.com';
COMMENT ON COLUMN shopify_stores.shopify_email IS 'Email address for Shopify store login';
COMMENT ON COLUMN shopify_stores.shopify_password IS 'Password for Shopify store login - should be encrypted in production';
COMMENT ON COLUMN shopify_stores.status IS 'Store status: active or inactive';
COMMENT ON COLUMN shopify_stores.created_at IS 'Timestamp when the store was added';
COMMENT ON COLUMN shopify_stores.updated_at IS 'Timestamp when the store was last modified';

-- Grant necessary permissions
GRANT ALL ON shopify_stores TO authenticated;
GRANT USAGE ON TYPE store_status TO authenticated;