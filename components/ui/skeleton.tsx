import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of skeleton lines to render
   */
  lines?: number
  /**
   * Width variants for different skeleton sizes
   */
  variant?: 'default' | 'card' | 'table' | 'chart'
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, lines = 1, variant = 'default', ...props }, ref) => {
    const baseClasses = 'animate-pulse bg-neutral-800 rounded'
    
    const variantClasses = {
      default: 'h-4',
      card: 'h-6',
      table: 'h-12',
      chart: 'h-[400px]'
    }

    if (lines === 1) {
      return (
        <div
          ref={ref}
          className={cn(baseClasses, variantClasses[variant], className)}
          {...props}
        />
      )
    }

    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              variantClasses[variant],
              // Vary width for realistic look
              index === lines - 1 ? 'w-3/4' : 'w-full',
              className
            )}
          />
        ))}
      </div>
    )
  }
)
Skeleton.displayName = 'Skeleton'

// Specialized skeleton components
export const KPISkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <div className="flex items-center">
          <Skeleton className="h-3 w-3 rounded-full mr-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    ))}
  </div>
)

export const ChartSkeleton = () => (
  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-6">
    <div className="flex items-center mb-4">
      <Skeleton className="h-6 w-32" />
    </div>
    <Skeleton variant="chart" />
  </div>
)

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-neutral-950 border border-neutral-800 rounded-lg">
    <div className="p-4 border-b border-neutral-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16 bg-blue-500" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    <div className="p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-800">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  </div>
)

export const FiltersSkeleton = () => (
  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  </div>
)

export { Skeleton }