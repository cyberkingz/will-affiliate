'use client'

import React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { DateRange } from 'react-day-picker'

interface ModernCalendarProps {
  mode?: 'single' | 'range'
  selected?: Date | DateRange | undefined
  onSelect?: (date: Date | DateRange | undefined) => void
  className?: string
  variant?: 'default' | 'premium' | 'minimal'
  numberOfMonths?: number
  disabled?: (date: Date) => boolean
  defaultMonth?: Date
}

export function ModernCalendar({
  mode = 'range',
  selected,
  onSelect,
  className,
  variant = 'default',
  numberOfMonths = 1,
  disabled,
  defaultMonth
}: ModernCalendarProps) {
  const variants = {
    default: 'bg-neutral-900 border-neutral-700',
    premium: 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border-neutral-600 shadow-2xl',
    minimal: 'bg-neutral-950 border-neutral-800'
  }

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        duration: 0.3,
        staggerChildren: 0.02
      }
    }
  }

  const dayVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "p-4 rounded-xl border backdrop-blur-sm",
        variants[variant],
        className
      )}
    >
      {/* Header */}
      <motion.div 
        className="mb-4 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-sm font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent tracking-tight">
          Select Date Range
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Choose dates for your campaign analysis
        </p>
      </motion.div>

      {/* Calendar */}
      <Calendar
        mode={mode}
        selected={selected}
        onSelect={onSelect}
        numberOfMonths={numberOfMonths}
        defaultMonth={defaultMonth}
        disabled={disabled}
        className={cn(
          "w-full",
          // Modern styling for the calendar
          "[&_.rdp]:bg-transparent",
          "[&_.rdp-months]:space-x-0",
          "[&_.rdp-month]:space-y-4",
          "[&_.rdp-caption]:flex [&_.rdp-caption]:justify-center [&_.rdp-caption]:items-center [&_.rdp-caption]:mb-4",
          "[&_.rdp-caption_label]:text-sm [&_.rdp-caption_label]:font-bold [&_.rdp-caption_label]:text-neutral-100",
          
          // Navigation buttons
          "[&_.rdp-nav]:absolute [&_.rdp-nav]:inset-x-0 [&_.rdp-nav]:top-0 [&_.rdp-nav]:flex [&_.rdp-nav]:justify-between",
          "[&_.rdp-nav_button]:h-8 [&_.rdp-nav_button]:w-8 [&_.rdp-nav_button]:rounded-lg [&_.rdp-nav_button]:border-0",
          "[&_.rdp-nav_button]:bg-neutral-800/60 [&_.rdp-nav_button]:text-neutral-300",
          "[&_.rdp-nav_button:hover]:bg-neutral-700 [&_.rdp-nav_button:hover]:text-neutral-100",
          "[&_.rdp-nav_button:hover]:scale-105 [&_.rdp-nav_button]:transition-all [&_.rdp-nav_button]:duration-200",
          
          // Table styling
          "[&_.rdp-table]:w-full",
          "[&_.rdp-head_row]:mb-2",
          "[&_.rdp-head_cell]:text-xs [&_.rdp-head_cell]:font-medium [&_.rdp-head_cell]:text-neutral-400 [&_.rdp-head_cell]:pb-2",
          
          // Day styling
          "[&_.rdp-day]:h-9 [&_.rdp-day]:w-9 [&_.rdp-day]:text-sm [&_.rdp-day]:font-medium",
          "[&_.rdp-day]:rounded-lg [&_.rdp-day]:border-0",
          "[&_.rdp-day]:bg-transparent [&_.rdp-day]:text-neutral-300",
          "[&_.rdp-day:hover]:bg-neutral-700/60 [&_.rdp-day:hover]:text-neutral-100",
          "[&_.rdp-day:hover]:scale-105 [&_.rdp-day]:transition-all [&_.rdp-day]:duration-200",
          
          // Today styling
          "[&_.rdp-day_today]:bg-gradient-to-br [&_.rdp-day_today]:from-blue-600 [&_.rdp-day_today]:to-blue-700",
          "[&_.rdp-day_today]:text-white [&_.rdp-day_today]:font-bold",
          "[&_.rdp-day_today]:shadow-lg [&_.rdp-day_today]:shadow-blue-500/25",
          
          // Selected styling
          "[&_.rdp-day_selected]:bg-gradient-to-br [&_.rdp-day_selected]:from-emerald-600 [&_.rdp-day_selected]:to-emerald-700",
          "[&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:font-bold",
          "[&_.rdp-day_selected]:shadow-lg [&_.rdp-day_selected]:shadow-emerald-500/25",
          
          // Range styling
          "[&_.rdp-day_range_start]:bg-gradient-to-r [&_.rdp-day_range_start]:from-emerald-600 [&_.rdp-day_range_start]:to-emerald-500",
          "[&_.rdp-day_range_end]:bg-gradient-to-l [&_.rdp-day_range_end]:from-emerald-600 [&_.rdp-day_range_end]:to-emerald-500",
          "[&_.rdp-day_range_middle]:bg-emerald-500/20 [&_.rdp-day_range_middle]:text-emerald-100",
          
          // Disabled styling
          "[&_.rdp-day_disabled]:text-neutral-600 [&_.rdp-day_disabled]:cursor-not-allowed",
          "[&_.rdp-day_disabled:hover]:bg-transparent [&_.rdp-day_disabled:hover]:scale-100",
          
          // Outside month styling
          "[&_.rdp-day_outside]:text-neutral-600 [&_.rdp-day_outside]:opacity-50"
        )}
      />

      {/* Footer */}
      {variant === 'premium' && (
        <motion.div 
          className="mt-4 pt-3 border-t border-neutral-700/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>📊 Campaign Analysis</span>
            <span className="text-emerald-400">● Live Data</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}