# Team Management Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing a robust team management system in the WillAffiliate platform using Supabase. The system supports multi-tenant architecture with role-based access control, secure data isolation, and audit logging.

## Architecture

### Core Principles
- **Multi-tenant**: Each team has isolated access to their data
- **Role-based**: Owner → Admin → Member → Viewer hierarchy
- **Secure by default**: Row Level Security (RLS) enforces data isolation
- **Auditable**: All team actions are logged for compliance

### Database Schema

#### Teams Table
- Core team information (name, slug, settings)
- Billing and subscription management
- Trial period tracking

#### Team Memberships
- User-to-team relationships with roles
- Invitation tracking and permissions
- Soft deletion for historical data

#### Team Invitations
- Email-based invitation system
- Token-based acceptance flow
- Expiration and status tracking

#### Audit Logs
- Complete activity tracking
- IP and user agent logging
- Detailed action context

## Security Implementation

### Row Level Security (RLS)

All tables have comprehensive RLS policies that enforce:
- Users can only access teams they belong to
- Role-based permissions for different operations
- Secure helper functions for common checks

### Critical Security Features

1. **Enabled RLS on all tables**: Prevents unauthorized data access
2. **Helper functions with SECURITY DEFINER**: Consistent permission checking
3. **Audit logging**: All sensitive operations are tracked
4. **Token-based invitations**: Secure invitation acceptance flow

### Fixing Current Security Issues

The audit identified several critical issues that are addressed:

```sql
-- Fix: Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Fix: Update function security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## Team Roles and Permissions

### Role Hierarchy

1. **Owner**
   - Full team management access
   - Can delete teams
   - Can manage all members and roles
   - Cannot be removed by others

2. **Admin**
   - Can invite and remove members
   - Can manage team settings
   - Can manage network connections
   - Cannot modify owner role

3. **Member**
   - Can view team data
   - Can create and manage own campaigns
   - Can add ad spend entries
   - Limited administrative access

4. **Viewer**
   - Read-only access to team data
   - Cannot modify any data
   - Can view reports and analytics

### Permission Matrix

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View team data | ✅ | ✅ | ✅ | ✅ |
| Invite users | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ✅* | ❌ | ❌ |
| Delete team | ✅ | ❌ | ❌ | ❌ |
| Manage networks | ✅ | ✅ | ❌ | ❌ |
| Add campaigns | ✅ | ✅ | ✅ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |

*Admins cannot modify owner roles

## Implementation Steps

### 1. Database Migration

Run the migrations in order:

```bash
# Apply team schema
psql -f migrations/001_create_team_management_schema.sql

# Update existing tables
psql -f migrations/002_update_existing_tables_team_scope.sql

# Implement RLS policies
psql -f migrations/003_implement_team_rls_policies.sql

# Add helper functions
psql -f migrations/004_sample_queries_and_functions.sql
```

### 2. Deploy Edge Functions

```bash
# Deploy team invitation function
supabase functions deploy team-invite

# Deploy invitation acceptance function
supabase functions deploy team-accept-invite

# Deploy team management function
supabase functions deploy team-management
```

### 3. Data Migration Strategy

For existing users and data:

```sql
-- Create a default team for existing users
INSERT INTO teams (name, slug, description)
VALUES ('Default Team', 'default', 'Auto-created team for existing users');

-- Add existing users as owners of the default team
INSERT INTO team_memberships (team_id, user_id, role)
SELECT 
  (SELECT id FROM teams WHERE slug = 'default'),
  id,
  'owner'
FROM auth.users;

-- Update existing data to belong to the default team
UPDATE network_connections 
SET team_id = (SELECT id FROM teams WHERE slug = 'default')
WHERE team_id IS NULL;
```

### 4. Frontend Integration

#### Team Context Provider

```typescript
// contexts/TeamContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TeamContextType {
  currentTeam: Team | null
  userTeams: Team[]
  switchTeam: (teamId: string) => void
  userRole: TeamRole | null
}

export const TeamContext = createContext<TeamContextType>({} as TeamContextType)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [userTeams, setUserTeams] = useState<Team[]>([])
  const [userRole, setUserRole] = useState<TeamRole | null>(null)

  useEffect(() => {
    loadUserTeams()
  }, [])

  const loadUserTeams = async () => {
    const { data } = await supabase.rpc('get_user_teams')
    if (data) {
      setUserTeams(data)
      if (data.length > 0 && !currentTeam) {
        setCurrentTeam(data[0])
        setUserRole(data[0].user_role)
      }
    }
  }

  const switchTeam = (teamId: string) => {
    const team = userTeams.find(t => t.team_id === teamId)
    if (team) {
      setCurrentTeam(team)
      setUserRole(team.user_role)
    }
  }

  return (
    <TeamContext.Provider value={{
      currentTeam,
      userTeams,
      switchTeam,
      userRole
    }}>
      {children}
    </TeamContext.Provider>
  )
}

export const useTeam = () => useContext(TeamContext)
```

#### Team Invitation Component

```typescript
// components/TeamInvitation.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TeamInvitationProps {
  teamId: string
  onSuccess: () => void
}

export function TeamInvitation({ teamId, onSuccess }: TeamInvitationProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('member')
  const [loading, setLoading] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('team-invite', {
        body: { teamId, email, role }
      })

      if (error) throw error

      setEmail('')
      onSuccess()
    } catch (error) {
      console.error('Failed to send invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleInvite} className="space-y-4">
      <div>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label htmlFor="role">Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
        >
          <option value="viewer">Viewer</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
    </form>
  )
}
```

### 5. Real-time Updates

Enable real-time subscriptions for team data:

```typescript
// hooks/useTeamSubscription.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTeam } from '@/contexts/TeamContext'

export function useTeamSubscription() {
  const { currentTeam } = useTeam()

  useEffect(() => {
    if (!currentTeam) return

    // Subscribe to team membership changes
    const membershipSubscription = supabase
      .channel(`team-${currentTeam.team_id}-memberships`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_memberships',
        filter: `team_id=eq.${currentTeam.team_id}`,
      }, (payload) => {
        // Handle membership changes
        console.log('Membership changed:', payload)
      })
      .subscribe()

    // Subscribe to team invitations
    const invitationSubscription = supabase
      .channel(`team-${currentTeam.team_id}-invitations`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_invitations',
        filter: `team_id=eq.${currentTeam.team_id}`,
      }, (payload) => {
        // Handle invitation changes
        console.log('Invitation changed:', payload)
      })
      .subscribe()

    return () => {
      membershipSubscription.unsubscribe()
      invitationSubscription.unsubscribe()
    }
  }, [currentTeam])
}
```

## Best Practices

### 1. Data Isolation
- Always filter queries by team_id
- Use RLS policies consistently
- Validate team membership in Edge functions

### 2. Performance Optimization
- Index all team_id columns
- Use prepared statements for common queries
- Implement pagination for large datasets

### 3. Security
- Validate all inputs in Edge functions
- Use SECURITY DEFINER functions for privilege escalation
- Log all sensitive operations

### 4. User Experience
- Provide clear feedback for permission errors
- Show team context in the UI
- Enable smooth team switching

### 5. Monitoring
- Monitor audit logs for suspicious activity
- Track invitation acceptance rates
- Monitor team growth and activity

## Common Queries

See `migrations/004_sample_queries_and_functions.sql` for comprehensive examples including:

- Getting user teams and roles
- Fetching team members
- Calculating team statistics
- Viewing audit logs
- Performance analytics

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Ensure user is authenticated: `auth.uid() IS NOT NULL`
   - Check team membership: `user_is_team_member(team_id)`
   - Verify role permissions: `user_has_team_role(team_id, 'admin')`

2. **Data Not Visible**
   - Confirm RLS is enabled on table
   - Check if team_id is properly set
   - Verify user has team membership

3. **Invitation Failures**
   - Check email format validation
   - Verify invitation hasn't expired
   - Ensure user has invitation permissions

4. **Performance Issues**
   - Add indexes on team_id columns
   - Use proper query filters
   - Implement pagination

### Debugging Queries

```sql
-- Check user's team memberships
SELECT * FROM team_memberships WHERE user_id = auth.uid();

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'teams';

-- Check team data access
SELECT user_is_team_member('team-uuid-here');
```

## Migration from Single-Tenant

If you're currently using a single-tenant system:

1. **Backup your data** before starting
2. **Create a default team** for existing users
3. **Migrate existing data** to the default team
4. **Update application code** to use team context
5. **Test thoroughly** before deploying

This implementation provides a solid foundation for team-based multi-tenancy while maintaining security and performance.