'use client'

import React, { useMemo, useState } from 'react'
import { CalendarIcon, Clock, TrendingUp, ChevronRight } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getDateTemplates, formatDateRange } from '@/lib/utils/date-templates'

interface MobileDateRangeSelectorProps {
  dateRange: { from: Date; to: Date }
  onDateRangeChange: (range: { from: Date; to: Date }) => void
  className?: string
}

// Mobile-optimized quick templates
const MOBILE_QUICK_TEMPLATES = [
  { id: 'today', label: 'Today', icon: Clock, category: 'recent' },
  { id: 'yesterday', label: 'Yesterday', icon: Clock, category: 'recent' },
  { id: 'last-3-days', label: 'Last 3 Days', icon: TrendingUp, category: 'recent' },
  { id: 'last-7-days', label: 'Last 7 Days', icon: TrendingUp, category: 'weekly' },
  { id: 'last-14-days', label: 'Last 14 Days', icon: TrendingUp, category: 'weekly' },
  { id: 'last-30-days', label: 'Last 30 Days', icon: TrendingUp, category: 'monthly' },
  { id: 'this-week', label: 'This Week', icon: TrendingUp, category: 'weekly' },
  { id: 'last-week', label: 'Last Week', icon: TrendingUp, category: 'weekly' },
  { id: 'this-month', label: 'This Month', icon: TrendingUp, category: 'monthly' },
  { id: 'last-month', label: 'Last Month', icon: TrendingUp, category: 'monthly' },
]

const TEMPLATE_CATEGORIES = [
  { id: 'recent', label: 'Recent', description: 'Daily performance' },
  { id: 'weekly', label: 'Weekly', description: 'Weekly trends' },
  { id: 'monthly', label: 'Monthly', description: 'Monthly analysis' },
]

export function MobileDateRangeSelector({
  dateRange,
  onDateRangeChange,
  className
}: MobileDateRangeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('recent')
  const dateTemplates = useMemo(() => getDateTemplates(), [])

  const applyTemplate = (templateId: string) => {
    const template = dateTemplates.find(t => t.id === templateId)
    if (template) {
      const range = template.getValue()
      onDateRangeChange(range)
      setOpen(false)
    }
  }

  const dayCount = differenceInDays(dateRange.to, dateRange.from) + 1
  const currentLabel = formatDateRange(dateRange.from, dateRange.to)
  
  // Check if current range matches any template
  const currentTemplate = dateTemplates.find(template => {
    const templateRange = template.getValue()
    const isSameFrom = Math.abs(templateRange.from.getTime() - dateRange.from.getTime()) < 1000
    const isSameTo = Math.abs(templateRange.to.getTime() - dateRange.to.getTime()) < 1000
    return isSameFrom && isSameTo
  })

  const filteredTemplates = MOBILE_QUICK_TEMPLATES.filter(t => t.category === selectedCategory)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-10 justify-between text-left font-normal bg-background min-w-[160px]",
            "touch-manipulation", // Better mobile touch response
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-sm truncate">{currentLabel}</span>
              {dayCount > 1 && (
                <span className="text-xs text-muted-foreground">{dayCount} days</span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader className="text-left">
          <SheetTitle>Select Date Range</SheetTitle>
          <SheetDescription>
            Choose a time period for your campaign analysis
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current Selection */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{currentLabel}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                </div>
              </div>
              <Badge variant="outline" className="text-sm px-2 py-1">
                {dayCount} day{dayCount !== 1 ? 's' : ''}
              </Badge>
            </div>
            {currentTemplate && (
              <div className="text-xs text-muted-foreground mt-2">
                {currentTemplate.description}
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <h4 className="font-medium">Quick Select</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {TEMPLATE_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-shrink-0 h-auto py-2 px-3 text-xs",
                    "touch-manipulation min-w-[80px]"
                  )}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="text-center">
                    <div className="font-medium">{category.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{category.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Template Options */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground capitalize">
              {selectedCategory} Periods
            </h5>
            <div className="grid gap-2">
              {filteredTemplates.map((template) => {
                const Icon = template.icon
                const isSelected = currentTemplate?.id === template.id
                const templateData = dateTemplates.find(t => t.id === template.id)
                const templateRange = templateData?.getValue()
                const templateDays = templateRange ? 
                  differenceInDays(templateRange.to, templateRange.from) + 1 : 0

                return (
                  <Button
                    key={template.id}
                    variant={isSelected ? "secondary" : "outline"}
                    size="lg"
                    className={cn(
                      "h-auto p-4 justify-start text-left",
                      "touch-manipulation", // Better mobile interaction
                      isSelected && "border-primary bg-primary/10"
                    )}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <Icon className="h-5 w-5 mr-3 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{template.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {templateData?.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {templateDays}d
                    </Badge>
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Custom Range Option */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">
              Custom Range
            </h5>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto p-4 justify-start text-left touch-manipulation"
              onClick={() => {
                // This would open a custom calendar picker
                // For now, just close the sheet
                setOpen(false)
              }}
            >
              <CalendarIcon className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <div className="font-medium">Pick Custom Dates</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Select any date range
                </div>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
