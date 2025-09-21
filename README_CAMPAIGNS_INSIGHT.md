# Campaigns Insight App

A comprehensive affiliate marketing analytics dashboard built with Next.js 15, Supabase, and shadcn/ui.

## 🚀 Features

### Authentication & Security
- ✅ Email/password authentication with Supabase Auth
- ✅ Role-based access control (admin vs staff)
- ✅ Row Level Security (RLS) for multi-tenant data isolation
- ✅ Route protection middleware

### Dashboard Analytics
- ✅ **KPI Cards**: Revenue, Clicks, Conversions, CVR, EPC, ROAS
- ✅ **Interactive Charts**: Multi-line trends with revenue, clicks, conversions
- ✅ **Advanced Filters**: Date ranges, networks, campaigns, sub-IDs
- ✅ **Real-time Updates**: Sync status monitoring

### Campaign Management
- ✅ **Data Table**: Sortable, filterable campaigns with performance metrics
- ✅ **Campaign Details**: Drill-down views with sub-ID and daily breakdowns
- ✅ **Multi-network Support**: Aggregate data across different affiliate networks
- ✅ **Export Functionality**: CSV exports for reporting

### Admin Tools
- ✅ **Network Connections**: CRUD operations for affiliate network integrations
- ✅ **User Management**: Grant/revoke network access per user
- ✅ **Manual Sync**: Trigger data synchronization with external APIs
- ✅ **Health Monitoring**: Connection status and sync history

## 🛠 Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase with PostgreSQL
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Tables**: TanStack React Table
- **Type Safety**: TypeScript with generated Supabase types

## 📁 Project Structure

```
├── app/
│   ├── auth/                 # Authentication pages
│   ├── dashboard/            # Main dashboard
│   ├── admin/               # Admin pages
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── dashboard/           # Dashboard components
│   └── admin/               # Admin components
├── lib/
│   ├── supabase/           # Supabase client configuration
│   └── utils.ts            # Utility functions
├── types/
│   └── supabase.ts         # Generated TypeScript types
└── supabase_campaigns_insight_schema.sql  # Database schema
```

## 🚀 Getting Started

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

1. Go to your Supabase dashboard
2. Run the SQL schema from `supabase_campaigns_insight_schema.sql`
3. Enable Row Level Security on all tables
4. Create your first admin user

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📊 Database Schema

### Core Tables

1. **users** - User profiles extending Supabase auth
2. **network_connections** - Affiliate network integrations
3. **user_network_access** - Multi-tenant access control
4. **campaigns_data** - Campaign performance metrics
5. **ad_spend_entries** - User-entered ad spend for ROAS
6. **sync_logs** - Data synchronization audit trail

### Key Features

- **Multi-tenant Architecture**: Users only see data for networks they have access to
- **Performance Optimized**: Strategic indexes for time-series queries
- **Audit Trail**: Complete tracking of data changes and sync operations
- **Metrics Calculation**: Built-in functions for CVR, EPC, ROAS calculations

## 🔧 API Endpoints

### Dashboard APIs
- `GET /api/campaigns/filters` - Available filter options
- `POST /api/campaigns/summary` - KPIs and trends data
- `POST /api/campaigns/table` - Campaigns table data
- `GET /api/campaigns/[id]` - Individual campaign details

### Admin APIs
- `POST /api/sync/[connectionId]` - Manual sync trigger
- `GET /api/health/sync-status` - Sync status monitoring

## 🎨 UI Components

Built with shadcn/ui components:

- **Layout**: Cards, Tabs, Separators
- **Forms**: Input, Select, Button, Label
- **Data**: Tables, Charts, Badges
- **Feedback**: Toast, Alert, Progress, Skeleton
- **Navigation**: Dropdown Menu, Tooltip
- **Modals**: Dialog, Sheet, Alert Dialog

## 🔒 Security Features

### Row Level Security Policies

1. **campaigns_data**: Users can only access data for networks they're granted
2. **network_connections**: Staff see only granted networks, admins see all
3. **user_network_access**: Only admins can manage access grants
4. **ad_spend_entries**: Users can only manage their own entries

### Access Control

- **Admin Role**: Full access to all features and data
- **Staff Role**: Limited to granted networks and read-only operations
- **Route Protection**: Middleware enforces authentication on protected routes

## 📈 Performance Optimizations

### Database Indexes
- Time-series optimized indexes on `(network_connection_id, day)`
- Campaign-specific indexes for fast filtering
- User access optimized queries with RLS

### Frontend Optimizations
- React Table for efficient data rendering
- Recharts for performant chart visualizations
- Proper loading states and error boundaries

## 🧪 Sample Data

The application includes sample data generation for testing:
- Mock network connections
- Simulated campaign performance data
- Test ad spend entries
- Sync status simulation

## 📝 Usage Guide

### For Admins

1. **Setup Networks**: Add affiliate network connections in Admin > Connections
2. **Grant Access**: Assign staff members to specific networks
3. **Monitor Sync**: Track data synchronization status and logs
4. **Manage Data**: Trigger manual syncs and backfills

### For Staff

1. **View Dashboard**: Access campaigns insight with filtering
2. **Analyze Performance**: Use KPI cards and trends charts
3. **Export Data**: Download campaign data as CSV
4. **Track Campaigns**: Drill down into individual campaign performance

## 🔄 Data Flow

1. **Data Ingestion**: External APIs → campaigns_data table
2. **Access Control**: RLS policies filter data by user permissions
3. **Analytics**: Helper functions calculate derived metrics
4. **Visualization**: React components render charts and tables
5. **Export**: CSV generation for reporting needs

## 🚀 Deployment

The application is ready for deployment on Vercel or similar platforms:

1. Connect your repository to Vercel
2. Add environment variables in deployment settings
3. Deploy and configure custom domain if needed

## 📄 License

This project is built for affiliate marketing analytics and campaign tracking.