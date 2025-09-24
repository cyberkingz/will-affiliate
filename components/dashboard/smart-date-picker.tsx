'use client'

import React, { useState, useEffect } from 'react'
import { CalendarIcon, Clock, TrendingUp, Zap, History } from 'lucide-react'
import { format, differenceInDays, startOfDay, endOfDay, isToday, isYesterday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CompactDateRangeSelector } from './compact-date-range-selector'

interface SmartDatePickerProps {
  dateRange: { from: Date; to: Date }
  onDateRangeChange: (range: { from: Date; to: Date }) => void
  className?: string
}

interface DateUsagePattern {
  templateId: string
  label: string
  useCount: number
  lastUsed: Date
  avgSessionDuration?: number
}

interface SerializedDateUsagePattern extends Omit<DateUsagePattern, 'lastUsed'> {
  lastUsed: string
}

// Common affiliate marketing periods with business context
const SMART_SUGGESTIONS = [
  {
    id: 'performance-check',
    label: 'Performance Check',
    description: 'Last 7 days',
    icon: TrendingUp,
    getValue: () => {
      const today = new Date()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(today.getDate() - 6)
      return { from: startOfDay(sevenDaysAgo), to: endOfDay(today) }
    },
    priority: 1
  },
  {
    id: 'monthly-review',
    label: 'Monthly Review',
    description: 'Last 30 days',
    icon: TrendingUp,
    getValue: () => {
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 29)
      return { from: startOfDay(thirtyDaysAgo), to: endOfDay(today) }
    },
    priority: 2
  },
  {
    id: 'daily-optimization',
    label: 'Daily Optimization',
    description: 'Yesterday vs today',
    icon: Zap,
    getValue: () => {
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      return { from: startOfDay(yesterday), to: endOfDay(today) }
    },
    priority: 3
  }
]

export function SmartDatePicker({
  dateRange,
  onDateRangeChange,
  className
}: SmartDatePickerProps) {
  const [usagePatterns, setUsagePatterns] = useState<DateUsagePattern[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load usage patterns from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('datePickerUsagePatterns')
    if (stored) {
      try {
        const serializedPatterns = JSON.parse(stored) as SerializedDateUsagePattern[]
        const patterns = serializedPatterns.map(pattern => ({
          ...pattern,
          lastUsed: new Date(pattern.lastUsed)
        }))
        setUsagePatterns(patterns)
      } catch {
        setUsagePatterns([])
      }
    }
  }, [])

  // Track usage pattern
  const trackUsage = (templateId: string, label: string) => {
    const now = new Date()
    const existingPattern = usagePatterns.find(p => p.templateId === templateId)
    
    let newPatterns: DateUsagePattern[]
    if (existingPattern) {
      newPatterns = usagePatterns.map(p => 
        p.templateId === templateId 
          ? { ...p, useCount: p.useCount + 1, lastUsed: now }
          : p
      )
    } else {
      newPatterns = [...usagePatterns, {
        templateId,
        label,
        useCount: 1,
        lastUsed: now
      }]
    }
    
    // Keep only top 10 most used patterns
    newPatterns.sort((a, b) => b.useCount - a.useCount)
    newPatterns = newPatterns.slice(0, 10)
    
    setUsagePatterns(newPatterns)
    localStorage.setItem('datePickerUsagePatterns', JSON.stringify(newPatterns))
  }

  const applySmartSuggestion = (suggestion: typeof SMART_SUGGESTIONS[0]) => {
    const range = suggestion.getValue()
    onDateRangeChange(range)
    trackUsage(suggestion.id, suggestion.label)
  }

  const dayCount = differenceInDays(dateRange.to, dateRange.from) + 1
  const isCurrentPeriod = isToday(dateRange.to) || isYesterday(dateRange.to)
  
  // Get smart label for current range
  const getSmartLabel = () => {
    if (dayCount === 1) {
      if (isToday(dateRange.from)) return 'Today'
      if (isYesterday(dateRange.from)) return 'Yesterday'
      return format(dateRange.from, 'MMM d')
    }
    
    if (dayCount === 7 && isCurrentPeriod) return 'Last 7 Days'
    if (dayCount === 30 && isCurrentPeriod) return 'Last 30 Days'
    if (dayCount === 14 && isCurrentPeriod) return 'Last 2 Weeks'
    
    return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
  }

  // Get frequently used patterns
  const getFrequentPatterns = () => {
    return usagePatterns
      .filter(p => p.useCount >= 2)
      .slice(0, 3)
  }

  const frequentPatterns = getFrequentPatterns()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1">
        {SMART_SUGGESTIONS.slice(0, 2).map((suggestion) => {
          const Icon = suggestion.icon
          const range = suggestion.getValue()
          const isActive = 
            Math.abs(range.from.getTime() - dateRange.from.getTime()) < 1000 &&
            Math.abs(range.to.getTime() - dateRange.to.getTime()) < 1000
          
          return (
            <Button
              key={suggestion.id}
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "h-8 text-xs font-normal gap-1.5",
                isActive && "bg-primary/10 text-primary border-primary/30"
              )}
              onClick={() => applySmartSuggestion(suggestion)}
            >
              <Icon className="h-3 w-3" />
              {suggestion.description}
            </Button>
          )
        })}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Main Date Range Display */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left font-normal min-w-[160px]",
              "bg-background hover:bg-accent/50"
            )}
          >
            <CalendarIcon className="mr-2 h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{getSmartLabel()}</span>
            {dayCount > 1 && (
              <Badge variant="outline" className="ml-2 h-4 text-xs px-1 bg-muted/50">
                {dayCount}d
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Frequent Patterns */}
            {frequentPatterns.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Frequently Used</h4>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {frequentPatterns.map((pattern) => (
                    <Button
                      key={pattern.templateId}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs font-normal"
                      onClick={() => {
                        // This would need to be implemented to restore the pattern
                        console.log('Restore pattern:', pattern)
                      }}
                    >
                      <Clock className="mr-2 h-3 w-3" />
                      <span>{pattern.label}</span>
                      <Badge variant="outline" className="ml-auto h-4 text-xs px-1">
                        {pattern.useCount}x
                      </Badge>
                    </Button>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Smart Suggestions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Smart Suggestions</h4>
              <div className="grid grid-cols-1 gap-1">
                {SMART_SUGGESTIONS.map((suggestion) => {
                  const Icon = suggestion.icon
                  const range = suggestion.getValue()
                  const isActive = 
                    Math.abs(range.from.getTime() - dateRange.from.getTime()) < 1000 &&
                    Math.abs(range.to.getTime() - dateRange.to.getTime()) < 1000
                  
                  return (
                    <Button
                      key={suggestion.id}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "justify-start h-8 text-xs font-normal",
                        isActive && "bg-primary/10 text-primary"
                      )}
                      onClick={() => applySmartSuggestion(suggestion)}
                    >
                      <Icon className="mr-2 h-3 w-3" />
                      <div className="flex flex-col items-start">
                        <span>{suggestion.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </span>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Advanced Options */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs font-normal"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                Custom Date Range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Advanced Date Picker Modal */}
      {showAdvanced && (
        <CompactDateRangeSelector
          value={dateRange}
          onChange={(range) => {
            onDateRangeChange(range)
            setShowAdvanced(false)
          }}
          className="ml-2"
        />
      )}
    </div>
  )
}
