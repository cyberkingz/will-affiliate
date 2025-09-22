'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Clock, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getDateTemplates, formatDateRange, getDaysInRange, DateTemplate } from '@/lib/utils/date-templates'
import { cn } from '@/lib/utils'

interface DateRange {
  from: Date
  to: Date
}

interface CompactDateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function CompactDateRangeSelector({ value, onChange, className }: CompactDateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const templates = getDateTemplates()

  // Find if current range matches any template
  useEffect(() => {
    const matching = templates.find(template => {
      const templateRange = template.getValue()
      return Math.abs(templateRange.from.getTime() - value.from.getTime()) < 24 * 60 * 60 * 1000 && // Within 1 day
             Math.abs(templateRange.to.getTime() - value.to.getTime()) < 24 * 60 * 60 * 1000
    })
    setSelectedTemplate(matching?.id || null)
  }, [value, templates])

  const handleTemplateSelect = (template: DateTemplate) => {
    const range = template.getValue()
    onChange(range)
    setSelectedTemplate(template.id)
    setIsOpen(false)
  }

  const quickTemplates = templates.filter(t => t.category === 'quick')
  const businessTemplates = templates.filter(t => t.category === 'business')
  const comparisonTemplates = templates.filter(t => t.category === 'comparison')

  const displayText = selectedTemplate 
    ? templates.find(t => t.id === selectedTemplate)?.label || formatDateRange(value.from, value.to)
    : formatDateRange(value.from, value.to)

  const dayCount = getDaysInRange(value.from, value.to)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 justify-between bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <span className="font-medium">{displayText}</span>
            {dayCount > 1 && (
              <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 text-xs">
                {dayCount} days
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 bg-neutral-900 border-neutral-700"
        align="start"
        sideOffset={4}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-neutral-200">Select Date Range</h4>
            <div className="text-xs text-neutral-500">
              Current: {dayCount} {dayCount === 1 ? 'day' : 'days'}
            </div>
          </div>

          {/* Quick Access Templates */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                  Quick Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto p-3 flex flex-col items-start gap-1 text-left",
                      selectedTemplate === template.id
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700"
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm">{template.icon}</span>
                      <span className="text-sm font-medium">{template.label}</span>
                    </div>
                    <span className="text-xs opacity-70">{template.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-neutral-800" />

            {/* Business Templates */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-3 w-3 text-green-400" />
                <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                  Business Periods
                </span>
              </div>
              <div className="space-y-1">
                {businessTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start h-auto p-2",
                      selectedTemplate === template.id
                        ? "bg-green-600 text-white"
                        : "text-neutral-200 hover:bg-neutral-800"
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{template.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{template.label}</div>
                        <div className="text-xs opacity-70">{template.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-neutral-800" />

            {/* Comparison Templates */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-orange-400 uppercase tracking-wide">
                  Extended Periods
                </span>
              </div>
              <div className="space-y-1">
                {comparisonTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start h-auto p-2",
                      selectedTemplate === template.id
                        ? "bg-orange-600 text-white"
                        : "text-neutral-200 hover:bg-neutral-800"
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{template.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{template.label}</div>
                        <div className="text-xs opacity-70">{template.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Range Note */}
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <div className="text-xs text-neutral-500 text-center">
              Need a custom range? Use the calendar in Advanced Filters
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}