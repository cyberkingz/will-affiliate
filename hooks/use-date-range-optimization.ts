'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { differenceInDays, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns'
import { getDateTemplates } from '@/lib/utils/date-templates'

interface DateRangeState {
  from: Date
  to: Date
}

interface DateRangeOptimization {
  isStandardPeriod: boolean
  dayCount: number
  label: string
  cacheKey: string
  isRealtimeCapable: boolean
  templateId?: string
}

export function useDateRangeOptimization(dateRange: DateRangeState) {
  const [optimization, setOptimization] = useState<DateRangeOptimization>({
    isStandardPeriod: false,
    dayCount: 1,
    label: '',
    cacheKey: '',
    isRealtimeCapable: false
  })
  const templates = useMemo(() => getDateTemplates(), [])

  // Memoized calculations for performance
  const calculations = useMemo(() => {
    const dayCount = differenceInDays(dateRange.to, dateRange.from) + 1
    const isRealtimeCapable = isToday(dateRange.to) || isYesterday(dateRange.to)
    
    // Check if this matches a standard template
    const matchingTemplate = templates.find(template => {
      const templateRange = template.getValue()
      const isSameFrom = Math.abs(templateRange.from.getTime() - dateRange.from.getTime()) < 1000
      const isSameTo = Math.abs(templateRange.to.getTime() - dateRange.to.getTime()) < 1000
      return isSameFrom && isSameTo
    })

    // Standard periods for affiliate marketing
    const standardPeriods = [1, 3, 7, 14, 30, 60, 90]
    const isStandardPeriod = standardPeriods.includes(dayCount) && isRealtimeCapable

    // Generate cache key for API requests
    const cacheKey = matchingTemplate?.id || 
      `custom-${dateRange.from.getTime()}-${dateRange.to.getTime()}`

    // Generate smart label
    let label = ''
    if (matchingTemplate) {
      label = matchingTemplate.label
    } else if (dayCount === 1) {
      if (isToday(dateRange.from)) label = 'Today'
      else if (isYesterday(dateRange.from)) label = 'Yesterday'
      else label = dateRange.from.toLocaleDateString()
    } else {
      label = `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
    }

    return {
      dayCount,
      isStandardPeriod,
      isRealtimeCapable,
      cacheKey,
      label,
      templateId: matchingTemplate?.id
    }
  }, [dateRange, templates])

  // Update optimization state when calculations change
  useEffect(() => {
    setOptimization(calculations)
  }, [calculations])

  // Performance recommendations based on date range
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = []

    if (calculations.dayCount > 90) {
      recommendations.push('Consider using aggregated data for periods over 90 days')
    }

    if (calculations.isStandardPeriod) {
      recommendations.push('This period supports real-time data updates')
    }

    if (!calculations.isRealtimeCapable) {
      recommendations.push('Historical data - real-time updates not available')
    }

    if (calculations.dayCount === 1 && isToday(dateRange.from)) {
      recommendations.push('Today data updates every 15 minutes')
    }

    return recommendations
  }, [calculations, dateRange])

  // Get suggested comparison periods
  const getComparisonSuggestions = useCallback(() => {
    const { dayCount, templateId } = calculations
    const suggestions: Array<{ label: string; dateRange: DateRangeState; templateId?: string }> = []

    if (templateId === 'last-7-days') {
      // Previous 7 days
      const prevWeekEnd = new Date(dateRange.from)
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
      const prevWeekStart = new Date(prevWeekEnd)
      prevWeekStart.setDate(prevWeekStart.getDate() - 6)
      
      suggestions.push({
        label: 'Previous 7 Days',
        dateRange: { from: startOfDay(prevWeekStart), to: endOfDay(prevWeekEnd) }
      })
    }

    if (templateId === 'last-30-days') {
      // Previous 30 days
      const prevMonthEnd = new Date(dateRange.from)
      prevMonthEnd.setDate(prevMonthEnd.getDate() - 1)
      const prevMonthStart = new Date(prevMonthEnd)
      prevMonthStart.setDate(prevMonthStart.getDate() - 29)
      
      suggestions.push({
        label: 'Previous 30 Days',
        dateRange: { from: startOfDay(prevMonthStart), to: endOfDay(prevMonthEnd) }
      })
    }

    // Year over year for monthly periods
    if (dayCount >= 28 && dayCount <= 31) {
      const yearAgoStart = new Date(dateRange.from)
      yearAgoStart.setFullYear(yearAgoStart.getFullYear() - 1)
      const yearAgoEnd = new Date(dateRange.to)
      yearAgoEnd.setFullYear(yearAgoEnd.getFullYear() - 1)
      
      suggestions.push({
        label: 'Same Period Last Year',
        dateRange: { from: startOfDay(yearAgoStart), to: endOfDay(yearAgoEnd) }
      })
    }

    return suggestions
  }, [calculations, dateRange])

  // API request optimization
  const getApiOptimizations = useCallback(() => {
    const { dayCount, isStandardPeriod, cacheKey } = calculations

    return {
      cacheKey,
      cacheTimeout: isStandardPeriod ? (dayCount <= 7 ? 300000 : 900000) : 1800000, // 5min, 15min, 30min
      aggregation: dayCount > 60 ? 'daily' : 'hourly',
      realtimeUpdates: calculations.isRealtimeCapable,
      batchRequests: dayCount > 30
    }
  }, [calculations])

  return {
    optimization,
    getPerformanceRecommendations,
    getComparisonSuggestions,
    getApiOptimizations,
    isLoading: false
  }
}
