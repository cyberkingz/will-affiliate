'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export interface TrendData {
  hour: string
  time: string
  revenue: number
  clicks: number
  conversions: number
  spend: number
}

interface TrendsChartProps {
  data: TrendData[]
  isLoading?: boolean
}

export const TrendsChart = React.memo(function TrendsChart({ data, isLoading = false }: TrendsChartProps) {
  const formatCurrency = React.useMemo(() => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    []
  )

  const formatNumber = React.useMemo(() => 
    new Intl.NumberFormat('en-US'),
    []
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Hourly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full bg-neutral-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Hourly Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  return value // Show hour directly (e.g., "00:00", "01:00", etc.)
                }}
              />
              <YAxis 
                yAxisId="currency"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency.format(value)}
              />
              <YAxis 
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatNumber.format(value)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-neutral-800 border-neutral-700 p-3 border rounded-lg shadow-lg">
                        <p className="font-medium mb-2 text-neutral-100">
                          {label}
                        </p>
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm text-neutral-200" style={{ color: entry.color }}>
                            {entry.name}: {
                              entry.dataKey === 'revenue' || entry.dataKey === 'spend'
                                ? formatCurrency.format(entry.value as number)
                                : formatNumber.format(entry.value as number)
                            }
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="revenue"
                stroke="#ec4899"
                strokeWidth={3}
                name="Revenue ($)"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Clicks"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
})