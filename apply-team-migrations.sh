#!/bin/bash

# Apply Team Management System Migrations
# This script applies all the necessary migrations for the team management system

echo "================================"
echo "Team Management System Migration"
echo "================================"
echo ""
echo "This script will apply the following migrations:"
echo "1. Critical security fixes"
echo "2. Team management schema"
echo "3. Update existing tables with team scope"
echo "4. Implement RLS policies"
echo "5. Add helper functions and views"
echo ""
echo "⚠️  IMPORTANT: Make sure to backup your database before proceeding!"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

# Install Supabase CLI if not installed
if ! command -v supabase &> /dev/null
then
    echo "Installing Supabase CLI..."
    brew install supabase/tap/supabase
fi

# Login to Supabase
echo ""
echo "Logging in to Supabase..."
supabase login

# Get project reference
PROJECT_REF="rkfmpydtpjdprrjfkkcq"
echo "Using project: $PROJECT_REF"

# Apply migrations using the correct method
echo ""
echo "Applying migrations..."
echo ""

# Link to the project
echo "Linking to project..."
supabase link --project-ref $PROJECT_REF

# Create proper migration files in supabase directory
mkdir -p supabase/migrations

# Copy and apply migrations
echo "1. Applying critical security fixes..."
cp migrations/005_critical_security_fixes.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_critical_security_fixes.sql

echo "2. Creating team management schema..."
cp migrations/001_create_team_management_schema.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_create_team_management_schema.sql

echo "3. Updating existing tables with team scope..."
cp migrations/002_update_existing_tables_team_scope.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_update_existing_tables_team_scope.sql

echo "4. Implementing RLS policies..."
cp migrations/003_implement_team_rls_policies.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_implement_team_rls_policies.sql

echo "5. Adding helper functions and views..."
cp migrations/004_sample_queries_and_functions.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_sample_queries_and_functions.sql

# Push all migrations
echo "Pushing migrations to remote database..."
supabase db push

echo ""
echo "================================"
echo "Database migrations complete!"
echo "================================"
echo ""

# Deploy Edge Functions
echo "Deploying Edge Functions..."
echo ""

echo "1. Deploying team-invite function..."
supabase functions deploy team-invite --project-ref $PROJECT_REF

echo "2. Deploying team-accept-invite function..."
supabase functions deploy team-accept-invite --project-ref $PROJECT_REF

echo "3. Deploying team-management function..."
supabase functions deploy team-management --project-ref $PROJECT_REF

echo ""
echo "================================"
echo "Edge Functions deployed!"
echo "================================"
echo ""

echo "✅ Team Management System successfully installed!"
echo ""
echo "Next steps:"
echo "1. Create UI components for team management"
echo "2. Update existing components to use team context"
echo "3. Test the invitation system"
echo "4. Configure email settings for invitations"
echo ""