'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { SophisticatedLoading, ChartSkeleton } from './sophisticated-loading'
import { LoadingErrorState, LoadingTimeoutWarning, NetworkStatusIndicator, useNetworkStatus } from './loading-states'

export interface TrendData {
  hour: string
  time: string
  revenue: number
  clicks: number
  conversions: number
  spend: number
}

interface LoadingProgress {
  progress: number
  currentStep: string
  timeElapsed: number
  phase: 1 | 2 | 3 | 4
  networkContext?: string
}

interface TrendsChartProps {
  data: TrendData[]
  isLoading?: boolean
  loadingProgress?: LoadingProgress
  error?: string | null
  onRetry?: () => void
  onCancel?: () => void
  dateRange: {
    from: Date
    to: Date
  }
  networks?: string[]
  forceQuickLoading?: boolean
  className?: string
}

export const TrendsChart = React.memo(function TrendsChart({ 
  data, 
  isLoading = false, 
  loadingProgress,
  error,
  onRetry,
  onCancel,
  dateRange,
  networks = ['Affluent'],
  forceQuickLoading = false,
  className = ''
}: TrendsChartProps) {
  // Enhanced network monitoring
  const networkStatus = useNetworkStatus()
  
  // Detect if we're showing hourly or daily data
  const isHourlyData = data.length > 0 && data[0].hour && !data[0].hour.includes('-')
  const chartTitle = isHourlyData ? 'Hourly Performance Trends' : 'Daily Performance Trends'
  
  // Memoized formatters for performance
  const formatCurrency = useMemo(() => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    []
  )

  const formatNumber = useMemo(() => 
    new Intl.NumberFormat('en-US'),
    []
  )
  
  // Calculate loading characteristics for adaptive behavior
  const loadingCharacteristics = useMemo(() => {
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24))
    const dataPoints = isHourlyData ? 24 : daysDiff
    const dataType = daysDiff <= 1 ? 'hourly' : 'daily'
    const isComplexLoad = dataPoints > 48 || networks.length > 1 || daysDiff > 14
    
    return {
      daysDiff,
      dataPoints,
      dataType,
      isComplexLoad,
      expectedLoadTime: isComplexLoad ? 5 : 2
    }
  }, [dateRange, isHourlyData, networks.length])
  
  // Determine loading mode - default to sophisticated loading
  const shouldUseSophisticatedLoading = useMemo(() => {
    if (forceQuickLoading) return false
    
    // Always use sophisticated loading to show percentage
    // unless explicitly forced to quick loading
    return true
  }, [forceQuickLoading])

  // Enhanced loading state logic with adaptive behavior
  if (isLoading) {
    return (
      <div className={className}>
        <AnimatePresence mode="wait">
          {shouldUseSophisticatedLoading ? (
            <motion.div
              key="sophisticated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SophisticatedLoading
                title={chartTitle}
                expectedDataPoints={loadingCharacteristics.dataPoints}
                networks={networks}
                dateRange={dateRange}
                onCancel={onCancel}
                onRetry={onRetry}
                loadingTimeEstimate={loadingCharacteristics.expectedLoadTime * 1000}
              />
              
              {loadingProgress && loadingProgress.timeElapsed > loadingCharacteristics.expectedLoadTime * 1.5 && (
                <LoadingTimeoutWarning
                  timeElapsed={loadingProgress.timeElapsed}
                  expectedTime={loadingCharacteristics.expectedLoadTime}
                  onCancel={onCancel}
                  dataComplexity={{
                    dataPoints: loadingCharacteristics.dataPoints,
                    networks,
                    dateRange: `${loadingCharacteristics.daysDiff} days`
                  }}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChartSkeleton 
                title={chartTitle}
                dataType={loadingCharacteristics.dataType as 'daily' | 'hourly'}
                className={className}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
  
  // Enhanced error state with network context
  if (error && !isLoading) {
    return (
      <div className={className}>
        <LoadingErrorState
          error={error}
          onRetry={onRetry}
          canRetry={!!onRetry}
          chartTitle={chartTitle}
          networkStatus={networkStatus}
          onDismiss={onCancel}
        />
      </div>
    )
  }

  // Main chart component with enhanced animations
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.4, 0, 0.2, 1],
        delay: 0.1
      }}
    >
      <Card className="relative">
        {/* Subtle success animation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        
        <CardHeader>
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CardTitle className="flex items-center gap-3">
              <span>{chartTitle}</span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full"
              >
                {loadingCharacteristics.dataPoints} points
              </motion.div>
            </CardTitle>
            
            <NetworkStatusIndicator 
              isOnline={networkStatus.isOnline}
              networkStatus={networkStatus}
              showDetails={true}
            />
          </motion.div>
        </CardHeader>
        
        <CardContent>
          <motion.div 
            className="h-[400px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => {
                    // Handle both hourly (HH:MM) and daily (YYYY-MM-DD) formats
                    if (value.includes('-')) {
                      // Daily format: Show month/day
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    // Hourly format: Show as-is
                    return value
                  }}
                />
                <YAxis 
                  yAxisId="currency"
                  orientation="left"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => formatCurrency.format(value)}
                />
                <YAxis 
                  yAxisId="count"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#4b5563' }}
                  tickLine={{ stroke: '#4b5563' }}
                  tickFormatter={(value) => formatNumber.format(value)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <motion.div 
                          className="bg-neutral-800/95 backdrop-blur border-neutral-700 p-3 border rounded-lg shadow-xl"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          <p className="font-medium mb-2 text-neutral-100">
                            {label}
                          </p>
                          {payload.map((entry, index) => (
                            <motion.p 
                              key={index} 
                              className="text-sm text-neutral-200" 
                              style={{ color: entry.color }}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              {entry.name}: {
                                entry.dataKey === 'revenue' || entry.dataKey === 'spend'
                                  ? formatCurrency.format(entry.value as number)
                                  : formatNumber.format(entry.value as number)
                              }
                            </motion.p>
                          ))}
                        </motion.div>
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '12px'
                  }}
                />
                
                {/* Enhanced lines with better visual hierarchy */}
                <Line
                  yAxisId="currency"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ec4899"
                  strokeWidth={3}
                  name="Revenue ($)"
                  dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#1f2937' }}
                  activeDot={{ r: 6, fill: '#ec4899', strokeWidth: 2, stroke: '#1f2937' }}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Clicks"
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#1f2937' }}
                  activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#1f2937' }}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Conversions"
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#1f2937' }}
                  activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#1f2937' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
})
