export interface DateTemplate {
  id: string
  label: string
  description: string
  getValue: () => { from: Date; to: Date }
  category: 'quick' | 'business' | 'comparison'
  icon?: string
}

export const getDateTemplates = (): DateTemplate[] => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return [
    // Quick Access (Most Common)
    {
      id: 'last-7-days',
      label: 'Last 7 Days',
      description: 'Previous 7 days of data',
      category: 'quick',
      icon: '📊',
      getValue: () => {
        const from = new Date(today)
        from.setDate(today.getDate() - 7)
        return { from, to: today }
      }
    },
    {
      id: 'last-30-days',
      label: 'Last 30 Days',
      description: 'Previous 30 days of data',
      category: 'quick',
      icon: '📈',
      getValue: () => {
        const from = new Date(today)
        from.setDate(today.getDate() - 30)
        return { from, to: today }
      }
    },
    {
      id: 'yesterday',
      label: 'Yesterday',
      description: 'Previous day performance',
      category: 'quick',
      icon: '⏮️',
      getValue: () => {
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        return { from: yesterday, to: yesterday }
      }
    },
    {
      id: 'today',
      label: 'Today',
      description: 'Current day (real-time)',
      category: 'quick',
      icon: '⚡',
      getValue: () => {
        return { from: today, to: today }
      }
    },

    // Business Periods (Affiliate Specific)
    {
      id: 'this-month',
      label: 'Month to Date',
      description: 'From 1st to today',
      category: 'business',
      icon: '📅',
      getValue: () => {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: firstOfMonth, to: today }
      }
    },
    {
      id: 'last-month',
      label: 'Last Month',
      description: 'Complete previous month',
      category: 'business',
      icon: '📆',
      getValue: () => {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
        const firstOfLastMonth = new Date(year, lastMonth, 1)
        const lastOfLastMonth = new Date(year, lastMonth + 1, 0)
        return { from: firstOfLastMonth, to: lastOfLastMonth }
      }
    },
    {
      id: 'this-week',
      label: 'Week to Date',
      description: 'Monday to today',
      category: 'business',
      icon: '📋',
      getValue: () => {
        const startOfWeek = new Date(today)
        const dayOfWeek = today.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startOfWeek.setDate(today.getDate() - daysToMonday)
        return { from: startOfWeek, to: today }
      }
    },
    {
      id: 'last-week',
      label: 'Last Week',
      description: 'Complete previous week',
      category: 'business',
      icon: '🗓️',
      getValue: () => {
        const lastWeekEnd = new Date(today)
        const dayOfWeek = today.getDay()
        const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek
        lastWeekEnd.setDate(today.getDate() - daysToLastSunday)
        
        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
        
        return { from: lastWeekStart, to: lastWeekEnd }
      }
    },

    // Comparison Periods
    {
      id: 'last-90-days',
      label: 'Last 90 Days',
      description: 'Quarterly performance view',
      category: 'comparison',
      icon: '📊',
      getValue: () => {
        const from = new Date(today)
        from.setDate(today.getDate() - 90)
        return { from, to: today }
      }
    },
    {
      id: 'year-to-date',
      label: 'Year to Date',
      description: 'From January 1st to today',
      category: 'comparison',
      icon: '📈',
      getValue: () => {
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        return { from: startOfYear, to: today }
      }
    }
  ]
}

export const formatDateRange = (from: Date, to: Date): string => {
  const isSameDay = from.toDateString() === to.toDateString()
  
  if (isSameDay) {
    return from.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    })
  }
  
  const fromStr = from.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
  const toStr = to.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
  
  return `${fromStr} - ${toStr}`
}

export const getDaysInRange = (from: Date, to: Date): number => {
  const diffTime = Math.abs(to.getTime() - from.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}