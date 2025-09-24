'use client'

import * as React from "react"
import { TrendingUp, BarChart3, Calendar } from "lucide-react"
import { startOfMonth, subDays, addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ElegantDateRangePicker } from "./elegant-date-range-picker"
import { cn } from "@/lib/utils"

interface DateRange {
  from: Date
  to: Date
}

interface AffiliateCalendarPatternsProps {
  onDateRangeChange: (range: DateRange) => void
  currentRange: DateRange
  className?: string
}

// Affiliate marketing specific date patterns
const AFFILIATE_PATTERNS = [
  {
    id: 'campaign-launch',
    label: 'Campaign Launch Week',
    description: 'First 7 days of campaign performance',
    icon: TrendingUp,
    getValue: (launchDate?: Date) => {
      const launch = launchDate || new Date()
      return {
        from: launch,
        to: addDays(launch, 6)
      }
    },
    useCase: 'Initial campaign performance monitoring'
  },
  {
    id: 'weekend-performance',
    label: 'Weekend Analysis',
    description: 'Saturday-Sunday performance comparison',
    icon: BarChart3,
    getValue: () => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      
      // Find the most recent complete weekend
      let saturday: Date
      if (dayOfWeek === 0) { // Today is Sunday
        saturday = subDays(today, 1)
      } else if (dayOfWeek === 6) { // Today is Saturday
        saturday = today
      } else {
        saturday = subDays(today, dayOfWeek + 1)
      }
      
      return {
        from: saturday,
        to: addDays(saturday, 1)
      }
    },
    useCase: 'Weekend vs weekday conversion analysis'
  },
  {
    id: 'month-to-date',
    label: 'Month to Date',
    description: 'Current month performance',
    icon: Calendar,
    getValue: () => {
      const today = new Date()
      return {
        from: startOfMonth(today),
        to: today
      }
    },
    useCase: 'Monthly performance tracking'
  },
  {
    id: 'quarter-end',
    label: 'Quarter End Review',
    description: 'Last 90 days analysis',
    icon: TrendingUp,
    getValue: () => {
      const today = new Date()
      return {
        from: subDays(today, 89),
        to: today
      }
    },
    useCase: 'Quarterly business review and planning'
  }
]

// Campaign lifecycle phases
const CAMPAIGN_PHASES = [
  {
    phase: 'Testing',
    duration: '3-7 days',
    description: 'Initial campaign validation',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    patterns: ['today', 'yesterday', 'last-3-days', 'last-7-days']
  },
  {
    phase: 'Optimization',
    duration: '1-2 weeks',
    description: 'Performance improvement phase',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    patterns: ['last-7-days', 'last-14-days', 'this-week', 'last-week']
  },
  {
    phase: 'Scaling',
    duration: '2-4 weeks',
    description: 'Volume increase and expansion',
    color: 'bg-green-50 border-green-200 text-green-700',
    patterns: ['last-14-days', 'last-30-days', 'this-month', 'last-month']
  },
  {
    phase: 'Maintenance',
    duration: 'Ongoing',
    description: 'Long-term monitoring',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    patterns: ['last-30-days', 'last-90-days', 'year-to-date']
  }
]

export function AffiliateCalendarPatterns({
  onDateRangeChange,
  currentRange,
  className
}: AffiliateCalendarPatternsProps) {
  const [selectedPhase, setSelectedPhase] = React.useState<string>('Testing')

  const applyPattern = (pattern: typeof AFFILIATE_PATTERNS[0]) => {
    const range = pattern.getValue()
    onDateRangeChange(range)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Affiliate Marketing Date Patterns</h3>
        <p className="text-sm text-muted-foreground">
          Optimized date ranges for affiliate campaign analysis and performance tracking
        </p>
      </div>

      {/* Current Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Date Range</CardTitle>
            <Badge variant="outline">
              {Math.ceil((currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ElegantDateRangePicker
            value={currentRange}
            onChange={onDateRangeChange}
            size="lg"
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Campaign Phase Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Campaign Phase Patterns
          </CardTitle>
          <CardDescription>
            Select date ranges based on the current campaign phase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase Selection */}
          <div className="grid grid-cols-2 gap-2">
            {CAMPAIGN_PHASES.map((phase) => (
              <Button
                key={phase.phase}
                variant={selectedPhase === phase.phase ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-auto p-3 text-left justify-start",
                  selectedPhase === phase.phase && "shadow-sm"
                )}
                onClick={() => setSelectedPhase(phase.phase)}
              >
                <div>
                  <div className="font-medium text-sm">{phase.phase}</div>
                  <div className="text-xs text-muted-foreground">{phase.duration}</div>
                </div>
              </Button>
            ))}
          </div>

          {/* Phase Description */}
          {selectedPhase && (
            <div className={cn(
              "p-3 rounded-lg border",
              CAMPAIGN_PHASES.find(p => p.phase === selectedPhase)?.color
            )}>
              <div className="text-sm font-medium">
                {selectedPhase} Phase
              </div>
              <div className="text-xs mt-1">
                {CAMPAIGN_PHASES.find(p => p.phase === selectedPhase)?.description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Specialized Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Specialized Analysis Patterns
          </CardTitle>
          <CardDescription>
            Industry-specific date ranges for affiliate marketing insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {AFFILIATE_PATTERNS.map((pattern) => {
              const Icon = pattern.icon
              return (
                <Button
                  key={pattern.id}
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 justify-start text-left hover:bg-accent/50"
                  onClick={() => applyPattern(pattern)}
                >
                  <Icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{pattern.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {pattern.description}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1 italic">
                      Use case: {pattern.useCase}
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">Testing Phase (0-7 days)</h4>
            <ul className="text-muted-foreground space-y-1 text-xs ml-4">
              <li>• Monitor daily performance for quick optimization</li>
              <li>• Compare yesterday vs today for immediate insights</li>
              <li>• Use 3-day rolling averages to reduce noise</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Optimization Phase (1-2 weeks)</h4>
            <ul className="text-muted-foreground space-y-1 text-xs ml-4">
              <li>• Analyze weekly patterns and trends</li>
              <li>• Compare week-over-week performance</li>
              <li>• Identify day-of-week patterns</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Scaling Phase (2-4 weeks)</h4>
            <ul className="text-muted-foreground space-y-1 text-xs ml-4">
              <li>• Focus on 30-day trends and seasonality</li>
              <li>• Month-over-month performance comparison</li>
              <li>• Identify optimal scaling windows</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
