// Shared formatters to avoid recreating on every render
export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

export const numberFormatter = new Intl.NumberFormat('en-US')

export const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
})

export const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatCurrency = (value: number): string => {
  return currencyFormatter.format(value)
}

export const formatNumber = (value: number): string => {
  return numberFormatter.format(value)
}

export const formatCompactNumber = (value: number): string => {
  return compactNumberFormatter.format(value)
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`
}

export const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}