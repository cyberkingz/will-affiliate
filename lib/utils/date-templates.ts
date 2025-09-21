// Date template utilities for quick date range selection

export interface DateTemplate {
  id: string
  label: string
  getValue: () => { from: Date; to: Date }
  description?: string
}

export const dateTemplates: DateTemplate[] = [
  {
    id: 'today',
    label: 'Today',
    description: 'Current day',
    getValue: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)
      return { from: today, to: endOfDay }
    }
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    description: 'Previous day',
    getValue: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const endOfDay = new Date(yesterday)
      endOfDay.setHours(23, 59, 59, 999)
      return { from: yesterday, to: endOfDay }
    }
  },
  {
    id: 'last7days',
    label: 'Last 7 Days',
    description: 'Past week including today',
    getValue: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)
      return { from: sevenDaysAgo, to: today }
    }
  },
  {
    id: 'last14days',
    label: 'Last 14 Days',
    description: 'Past two weeks including today',
    getValue: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
      fourteenDaysAgo.setHours(0, 0, 0, 0)
      return { from: fourteenDaysAgo, to: today }
    }
  },
  {
    id: 'last30days',
    label: 'Last 30 Days',
    description: 'Past month including today',
    getValue: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      thirtyDaysAgo.setHours(0, 0, 0, 0)
      return { from: thirtyDaysAgo, to: today }
    }
  },
  {
    id: 'thisweek',
    label: 'This Week',
    description: 'Monday to Sunday of current week',
    getValue: () => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      return { from: startOfWeek, to: endOfWeek }
    }
  },
  {
    id: 'lastweek',
    label: 'Last Week',
    description: 'Monday to Sunday of previous week',
    getValue: () => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const startOfLastWeek = new Date(today)
      startOfLastWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7)
      startOfLastWeek.setHours(0, 0, 0, 0)
      
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
      endOfLastWeek.setHours(23, 59, 59, 999)
      
      return { from: startOfLastWeek, to: endOfLastWeek }
    }
  },
  {
    id: 'thismonth',
    label: 'This Month',
    description: 'Current calendar month',
    getValue: () => {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)
      
      return { from: startOfMonth, to: endOfMonth }
    }
  },
  {
    id: 'lastmonth',
    label: 'Last Month',
    description: 'Previous calendar month',
    getValue: () => {
      const today = new Date()
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      startOfLastMonth.setHours(0, 0, 0, 0)
      
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      endOfLastMonth.setHours(23, 59, 59, 999)
      
      return { from: startOfLastMonth, to: endOfLastMonth }
    }
  },
  {
    id: 'last90days',
    label: 'Last 90 Days',
    description: 'Past quarter including today',
    getValue: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)
      ninetyDaysAgo.setHours(0, 0, 0, 0)
      return { from: ninetyDaysAgo, to: today }
    }
  },
  {
    id: 'thisyear',
    label: 'This Year',
    description: 'Current calendar year',
    getValue: () => {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      startOfYear.setHours(0, 0, 0, 0)
      
      const endOfYear = new Date(today.getFullYear(), 11, 31)
      endOfYear.setHours(23, 59, 59, 999)
      
      return { from: startOfYear, to: endOfYear }
    }
  },
  {
    id: 'lastyear',
    label: 'Last Year',
    description: 'Previous calendar year',
    getValue: () => {
      const today = new Date()
      const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1)
      startOfLastYear.setHours(0, 0, 0, 0)
      
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31)
      endOfLastYear.setHours(23, 59, 59, 999)
      
      return { from: startOfLastYear, to: endOfLastYear }
    }
  }
]

export function getDateTemplate(id: string): DateTemplate | undefined {
  return dateTemplates.find(template => template.id === id)
}

export function applyDateTemplate(templateId: string): { from: Date; to: Date } | null {
  const template = getDateTemplate(templateId)
  return template ? template.getValue() : null
}

export function getDateRangeLabel(from: Date, to: Date): string {
  // Check if the date range matches any template
  for (const template of dateTemplates) {
    const templateRange = template.getValue()
    
    // Compare dates (ignore milliseconds)
    const isSameFrom = Math.abs(templateRange.from.getTime() - from.getTime()) < 1000
    const isSameTo = Math.abs(templateRange.to.getTime() - to.getTime()) < 1000
    
    if (isSameFrom && isSameTo) {
      return template.label
    }
  }
  
  // Return formatted date range if no template matches
  return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`
}