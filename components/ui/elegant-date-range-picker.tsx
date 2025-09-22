'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, ChevronDown, Clock, Settings2, TrendingUp, Zap, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ModernCalendar } from '@/components/ui/modern-calendar'
import { getDateTemplates, formatDateRange, getDaysInRange, DateTemplate } from '@/lib/utils/date-templates'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface DateRange {
  from: Date
  to: Date
}

interface ElegantDateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
  variant?: 'default' | 'premium' | 'minimal'
}

export function ElegantDateRangePicker({ 
  value, 
  onChange, 
  className,
  variant = 'default' 
}: ElegantDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const templates = getDateTemplates()

  // Detect current range status
  const getRangeStatus = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    if (value.from.toDateString() === today.toDateString() && value.to.toDateString() === today.toDateString()) {
      return { type: 'live', label: 'Live Data', color: 'emerald' }
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (value.from.toDateString() === yesterday.toDateString() && value.to.toDateString() === yesterday.toDateString()) {
      return { type: 'recent', label: 'Recent', color: 'blue' }
    }
    
    if (value.to.toDateString() === today.toDateString()) {
      return { type: 'current', label: 'Current', color: 'orange' }
    }
    
    return { type: 'historical', label: 'Historical', color: 'neutral' }
  }

  const status = getRangeStatus()

  // Find matching template
  useEffect(() => {
    const matching = templates.find(template => {
      const templateRange = template.getValue()
      return Math.abs(templateRange.from.getTime() - value.from.getTime()) < 24 * 60 * 60 * 1000 &&
             Math.abs(templateRange.to.getTime() - value.to.getTime()) < 24 * 60 * 60 * 1000
    })
    setSelectedTemplate(matching?.id || null)
  }, [value, templates])

  const handleTemplateSelect = (template: DateTemplate) => {
    const range = template.getValue()
    onChange(range)
    setSelectedTemplate(template.id)
    setIsOpen(false)
    setShowCalendar(false)
  }

  const handleCalendarSelect = (range: any) => {
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to })
      setSelectedTemplate(null)
      setIsOpen(false)
      setShowCalendar(false)
    }
  }

  const displayText = selectedTemplate 
    ? templates.find(t => t.id === selectedTemplate)?.label || formatDateRange(value.from, value.to)
    : formatDateRange(value.from, value.to)

  const dayCount = getDaysInRange(value.from, value.to)

  const statusColors = {
    live: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    recent: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    current: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    historical: 'bg-neutral-500/10 text-neutral-300 border-neutral-500/30'
  }

  const variants = {
    default: 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800',
    premium: 'bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-neutral-600 hover:from-neutral-800 hover:via-neutral-700 hover:to-neutral-800 shadow-lg',
    minimal: 'bg-background border-border hover:bg-accent/50'
  }

  const quickTemplates = templates.filter(t => t.category === 'quick')
  const businessTemplates = templates.filter(t => t.category === 'business')
  const comparisonTemplates = templates.filter(t => t.category === 'comparison')

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            className={cn(
              "h-10 justify-between text-neutral-200 border-neutral-700 transition-all duration-200",
              variants[variant],
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
              <Badge 
                variant="outline" 
                className={cn("text-xs", statusColors[status.type as keyof typeof statusColors])}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                {status.label}
              </Badge>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            </motion.div>
          </Button>
        </motion.div>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "p-0",
          variant === 'minimal' 
            ? 'w-80 bg-background border-border shadow-lg'
            : 'w-96 border-neutral-700',
          variant === 'premium' 
            ? 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 backdrop-blur-xl shadow-2xl' 
            : variant === 'default'
              ? 'bg-neutral-900'
              : 'bg-background'
        )}
        align="start"
        sideOffset={8}
      >
        <AnimatePresence mode="wait">
          {!showCalendar ? (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                variant === 'minimal' ? 'p-4' : 'p-5'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h4 className="text-sm font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                    Select Date Range
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Current: {dayCount} {dayCount === 1 ? 'day' : 'days'} • {status.label}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="text-neutral-400 hover:text-neutral-200"
                  onClick={() => setShowCalendar(true)}
                >
                  <Calendar className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Performance Templates */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                      Performance
                    </span>
                  </div>
                  <motion.div 
                    className="grid grid-cols-2 gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.05 }}
                  >
                    {quickTemplates.slice(0, 4).map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={selectedTemplate === template.id ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-auto p-3 flex flex-col items-start gap-1 text-left w-full",
                            selectedTemplate === template.id
                              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500 text-white shadow-lg"
                              : "bg-neutral-800/60 border-neutral-700 text-neutral-200 hover:bg-neutral-700/60"
                          )}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-sm">{template.icon}</span>
                            <span className="text-sm font-medium">{template.label}</span>
                          </div>
                          <span className="text-xs opacity-70">{template.description}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                <Separator className="bg-neutral-700/50" />

                {/* Analysis Templates */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                      Analysis
                    </span>
                  </div>
                  <div className="space-y-1">
                    {businessTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.03 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <Button
                          variant={selectedTemplate === template.id ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start h-auto p-2.5",
                            selectedTemplate === template.id
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                              : "text-neutral-200 hover:bg-neutral-800/60"
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
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-neutral-700/50" />

                {/* Extended Templates */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
                      Extended
                    </span>
                  </div>
                  <div className="space-y-1">
                    {comparisonTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.03 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <Button
                          variant={selectedTemplate === template.id ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start h-auto p-2.5",
                            selectedTemplate === template.id
                              ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white"
                              : "text-neutral-200 hover:bg-neutral-800/60"
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
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-neutral-700/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                  onClick={() => setShowCalendar(true)}
                >
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  Custom Date Range
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-2"
            >
              {/* Back Button */}
              <div className="mb-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-neutral-400 hover:text-neutral-200"
                  onClick={() => setShowCalendar(false)}
                >
                  ← Back to Templates
                </Button>
              </div>

              <ModernCalendar
                mode="range"
                selected={{ from: value.from, to: value.to }}
                onSelect={handleCalendarSelect}
                variant={variant}
                defaultMonth={value.from}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  )
}