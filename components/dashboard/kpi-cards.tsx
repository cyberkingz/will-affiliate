'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, MousePointer, Target, Percent, Calculator } from 'lucide-react'

export interface KPIData {
  revenue: {
    value: number
    change: number // percentage change
    period: string
  }
  clicks: {
    value: number
    change: number
  }
  conversions: {
    value: number
    change: number
  }
  cvr: {
    value: number // as percentage
    change: number
  }
  epc: {
    value: number // earnings per click
    change: number
  }
  roas: {
    value: number // return on ad spend
    change: number
  }
}

interface KPICardsProps {
  data: KPIData
  isLoading?: boolean
}

export function KPICards({ data, isLoading = false }: KPICardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const kpiItems = [
    {
      title: 'Revenue',
      value: formatCurrency(data.revenue.value),
      change: data.revenue.change,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Clicks',
      value: formatNumber(data.clicks.value),
      change: data.clicks.change,
      icon: MousePointer,
      color: 'text-blue-600'
    },
    {
      title: 'Conversions',
      value: formatNumber(data.conversions.value),
      change: data.conversions.change,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: 'CVR',
      value: formatPercentage(data.cvr.value),
      change: data.cvr.change,
      icon: Percent,
      color: 'text-orange-600'
    },
    {
      title: 'EPC',
      value: formatCurrency(data.epc.value),
      change: data.epc.change,
      icon: Calculator,
      color: 'text-indigo-600'
    },
    {
      title: 'ROAS',
      value: `${data.roas.value.toFixed(2)}x`,
      change: data.roas.change,
      icon: TrendingUp,
      color: 'text-emerald-600'
    }
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </CardTitle>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpiItems.map((item, index) => {
        const Icon = item.icon
        const isPositive = item.change >= 0
        const TrendIcon = isPositive ? TrendingUp : TrendingDown
        
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendIcon 
                  className={`mr-1 h-3 w-3 ${
                    isPositive ? 'text-green-500' : 'text-red-500'
                  }`} 
                />
                <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                  {isPositive ? '+' : ''}{item.change.toFixed(1)}%
                </span>
                <span className="ml-1">vs last period</span>
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}