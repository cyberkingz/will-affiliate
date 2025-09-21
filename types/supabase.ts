// ================================================================
// TypeScript Database Types for Campaigns Insight Application
// ================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'staff'
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'staff'
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'staff'
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      network_connections: {
        Row: {
          id: string
          name: string
          network_type: string
          affiliate_id: string | null
          api_key: string | null
          is_active: boolean
          last_sync_at: string | null
          last_sync_status: 'success' | 'error' | 'pending' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          network_type: string
          affiliate_id?: string | null
          api_key?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: 'success' | 'error' | 'pending' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          network_type?: string
          affiliate_id?: string | null
          api_key?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: 'success' | 'error' | 'pending' | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_network_access: {
        Row: {
          user_id: string
          network_connection_id: string
          granted_at: string
          granted_by: string | null
        }
        Insert: {
          user_id: string
          network_connection_id: string
          granted_at?: string
          granted_by?: string | null
        }
        Update: {
          user_id?: string
          network_connection_id?: string
          granted_at?: string
          granted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_network_access_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_network_access_network_connection_id_fkey"
            columns: ["network_connection_id"]
            referencedRelation: "network_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_network_access_granted_by_fkey"
            columns: ["granted_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      campaigns_data: {
        Row: {
          id: string
          network_connection_id: string
          campaign_id: string
          campaign_name: string | null
          offer_id: string | null
          day: string
          sub_id: string | null
          sub2: string | null
          sub3: string | null
          clicks: number
          conversions: number
          revenue: number
          payout: number | null
          impressions: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          network_connection_id: string
          campaign_id: string
          campaign_name?: string | null
          offer_id?: string | null
          day: string
          sub_id?: string | null
          sub2?: string | null
          sub3?: string | null
          clicks?: number
          conversions?: number
          revenue?: number
          payout?: number | null
          impressions?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          network_connection_id?: string
          campaign_id?: string
          campaign_name?: string | null
          offer_id?: string | null
          day?: string
          sub_id?: string | null
          sub2?: string | null
          sub3?: string | null
          clicks?: number
          conversions?: number
          revenue?: number
          payout?: number | null
          impressions?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_data_network_connection_id_fkey"
            columns: ["network_connection_id"]
            referencedRelation: "network_connections"
            referencedColumns: ["id"]
          }
        ]
      }
      ad_spend_entries: {
        Row: {
          id: string
          network_connection_id: string | null
          campaign_id: string | null
          sub_id: string | null
          day: string
          amount: number
          currency: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          network_connection_id?: string | null
          campaign_id?: string | null
          sub_id?: string | null
          day: string
          amount: number
          currency?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          network_connection_id?: string | null
          campaign_id?: string | null
          sub_id?: string | null
          day?: string
          amount?: number
          currency?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_entries_network_connection_id_fkey"
            columns: ["network_connection_id"]
            referencedRelation: "network_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_spend_entries_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sync_logs: {
        Row: {
          id: string
          network_connection_id: string
          started_at: string
          completed_at: string | null
          status: 'running' | 'completed' | 'failed'
          records_synced: number
          error_message: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          network_connection_id: string
          started_at?: string
          completed_at?: string | null
          status?: 'running' | 'completed' | 'failed'
          records_synced?: number
          error_message?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          network_connection_id?: string
          started_at?: string
          completed_at?: string | null
          status?: 'running' | 'completed' | 'failed'
          records_synced?: number
          error_message?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_network_connection_id_fkey"
            columns: ["network_connection_id"]
            referencedRelation: "network_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      campaign_performance_view: {
        Row: {
          network_connection_id: string
          network_name: string
          campaign_id: string
          campaign_name: string | null
          day: string
          clicks: number
          conversions: number
          revenue: number
          payout: number | null
          impressions: number | null
          ad_spend: number
          cvr: number
          epc: number
          roas: number
          profit: number
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_accessible_networks: {
        Args: {
          target_user_id: string
        }
        Returns: {
          network_id: string
          network_name: string
          network_type: string
          is_active: boolean
        }[]
      }
      calculate_campaign_metrics: {
        Args: {
          p_network_connection_id: string
          p_campaign_id?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          campaign_id: string
          campaign_name: string
          total_clicks: number
          total_conversions: number
          total_revenue: number
          total_spend: number
          cvr: number
          epc: number
          roas: number
          profit: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ================================================================
// UTILITY TYPES
// ================================================================

export type UserRole = Database['public']['Tables']['users']['Row']['role']
export type SyncStatus = Database['public']['Tables']['sync_logs']['Row']['status']
export type NetworkSyncStatus = Database['public']['Tables']['network_connections']['Row']['last_sync_status']

// Campaign metrics type for frontend use
export type CampaignMetrics = {
  campaign_id: string
  campaign_name: string | null
  clicks: number
  conversions: number
  revenue: number
  ad_spend: number
  cvr: number // Conversion rate
  epc: number // Earnings per click
  roas: number // Return on ad spend
  profit: number
  impressions?: number | null
}

// Dashboard summary type
export type DashboardSummary = {
  total_campaigns: number
  total_revenue: number
  total_spend: number
  total_profit: number
  total_clicks: number
  total_conversions: number
  average_cvr: number
  average_epc: number
  average_roas: number
}

// Network connection with access info
export type NetworkConnectionWithAccess = Database['public']['Tables']['network_connections']['Row'] & {
  has_access?: boolean
  access_granted_at?: string
  access_granted_by?: string
}

// User with accessible networks
export type UserWithNetworks = Database['public']['Tables']['users']['Row'] & {
  accessible_networks?: Database['public']['Tables']['network_connections']['Row'][]
}

// Campaign data with calculated metrics
export type CampaignDataWithMetrics = Database['public']['Tables']['campaigns_data']['Row'] & {
  ad_spend?: number
  cvr: number
  epc: number
  roas: number
  profit: number
  network_name?: string
}