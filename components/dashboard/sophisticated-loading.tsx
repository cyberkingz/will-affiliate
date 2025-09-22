'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Network, 
  TrendingUp, 
  Database, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  X,
  Clock
} from 'lucide-react'

interface LoadingPhase {
  id: number
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  description: string
  minProgress: number
  maxProgress: number
}

interface SophisticatedLoadingProps {
  title?: string
  expectedDataPoints?: number
  networks?: string[]
  dateRange?: { from: Date; to: Date }
  onCancel?: () => void
  onRetry?: () => void
  loadingTimeEstimate?: number
}

const LOADING_PHASES: LoadingPhase[] = [
  {
    id: 1,
    label: 'Connecting to Networks',
    icon: Network,
    description: 'Establishing secure connections to affiliate networks',
    minProgress: 0,
    maxProgress: 25
  },
  {
    id: 2,
    label: 'Fetching Performance Data',
    icon: Database,
    description: 'Retrieving revenue, clicks, and conversion metrics',
    minProgress: 25,
    maxProgress: 75
  },
  {
    id: 3,
    label: 'Processing Revenue Patterns',
    icon: TrendingUp,
    description: 'Analyzing trends and calculating performance indicators',
    minProgress: 75,
    maxProgress: 95
  },
  {
    id: 4,
    label: 'Rendering Visualization',
    icon: BarChart3,
    description: 'Building interactive charts and finalizing display',
    minProgress: 95,
    maxProgress: 100
  }
]

export function SophisticatedLoading({
  title = 'Daily Performance Trends',
  expectedDataPoints,
  networks = ['Affluent'],
  dateRange,
  onCancel,
  onRetry,
  loadingTimeEstimate = 3000
}: SophisticatedLoadingProps) {
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isStuck, setIsStuck] = useState(false)

  // Calculate data complexity for context
  const dataComplexity = React.useMemo(() => {
    if (!dateRange || !expectedDataPoints) return 'standard'
    
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 1 && expectedDataPoints <= 24) return 'simple'
    if (daysDiff <= 7 && expectedDataPoints <= 50) return 'standard'
    if (daysDiff <= 30 && expectedDataPoints <= 200) return 'complex'
    return 'very_complex'
  }, [dateRange, expectedDataPoints])

  // Adaptive timing based on complexity and network
  const adaptiveLoadingTime = React.useMemo(() => {
    const baseTime = loadingTimeEstimate
    const complexityMultiplier = {
      simple: 0.6,
      standard: 1.0,
      complex: 1.5,
      very_complex: 2.0
    }[dataComplexity]
    
    // Affluent API is consistently slow, add extra time
    const networkMultiplier = networks.includes('Affluent') || networks.includes('affluent') ? 1.5 : 1.0
    
    return baseTime * complexityMultiplier * networkMultiplier
  }, [loadingTimeEstimate, dataComplexity, networks])

  const updateProgress = useCallback(() => {
    const elapsed = Date.now() - startTime
    const targetProgress = Math.min((elapsed / adaptiveLoadingTime) * 100, 98)
    
    setProgress(prev => {
      const newProgress = prev + (targetProgress - prev) * 0.1
      return Math.min(newProgress, 98)
    })
    
    setElapsedTime(elapsed)
    
    // Determine current phase
    const phase = LOADING_PHASES.findIndex(p => targetProgress >= p.minProgress && targetProgress < p.maxProgress)
    setCurrentPhase(Math.max(0, phase))
    
    // Detect if loading seems stuck
    if (elapsed > adaptiveLoadingTime * 1.5) {
      setIsStuck(true)
    }
  }, [startTime, adaptiveLoadingTime])

  useEffect(() => {
    const interval = setInterval(updateProgress, 50) // 60fps updates
    return () => clearInterval(interval)
  }, [updateProgress])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const getContextualDescription = () => {
    const phase = LOADING_PHASES[currentPhase]
    if (!phase) return ''

    const isAffluent = networks.some(n => n.toLowerCase() === 'affluent')

    if (currentPhase === 0) {
      if (isAffluent) {
        return `Connecting to Affluent API (typically 600-800ms response time)`
      }
      return `Connecting to ${networks.join(', ')} network${networks.length > 1 ? 's' : ''}`
    }
    
    if (currentPhase === 1) {
      const pointsText = expectedDataPoints ? `${expectedDataPoints} data points` : 'performance metrics'
      if (isAffluent) {
        return `Fetching ${pointsText} from Affluent (this network has high latency)`
      }
      return `Fetching ${pointsText} for selected period`
    }
    
    if (currentPhase === 2) {
      const complexity = dataComplexity === 'simple' ? 'basic' : dataComplexity === 'very_complex' ? 'advanced' : 'detailed'
      return `Running ${complexity} analysis on revenue patterns`
    }
    
    return phase.description
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <div className="relative">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <motion.div
                className="absolute inset-0 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            {title}
          </CardTitle>
          
          {/* Prominent percentage indicator */}
          <div className="flex items-center gap-4">
            <motion.div 
              className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-2 flex items-center gap-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="text-3xl font-bold text-blue-400">
                {Math.round(progress)}
              </div>
              <div className="text-blue-300 text-sm font-medium">%</div>
            </motion.div>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-300">Progress</span>
            <div className="flex items-center gap-3 text-neutral-400">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              <div className="text-xl font-bold text-blue-400">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-neutral-800"
          />
        </div>

        {/* Phase Indicators */}
        <div className="space-y-3">
          {LOADING_PHASES.map((phase, index) => {
            const Icon = phase.icon
            const isActive = index === currentPhase
            const isCompleted = index < currentPhase || progress >= phase.maxProgress
            
            return (
              <motion.div
                key={phase.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-500/10 border border-blue-500/30' 
                    : isCompleted 
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-neutral-800/50 border border-neutral-700'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`flex-shrink-0 p-2 rounded-full ${
                  isActive 
                    ? 'bg-blue-500/20' 
                    : isCompleted 
                    ? 'bg-green-500/20'
                    : 'bg-neutral-700'
                }`}>
                  {isCompleted && !isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Icon className={`h-4 w-4 ${
                      isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-neutral-500'
                    }`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${
                    isActive ? 'text-blue-300' : isCompleted ? 'text-green-300' : 'text-neutral-400'
                  }`}>
                    {phase.label}
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">
                    {isActive ? getContextualDescription() : phase.description}
                  </div>
                </div>
                
                {isActive && (
                  <motion.div
                    className="flex-shrink-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Context Information */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-800/50 rounded-lg">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wider">Data Points</div>
            <div className="text-sm text-neutral-300">
              {expectedDataPoints ? `${expectedDataPoints} records` : 'Calculating...'}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wider">Networks</div>
            <div className="text-sm text-neutral-300">{networks.join(', ')}</div>
          </div>
        </div>

        {/* Error/Stuck State */}
        <AnimatePresence>
          {isStuck && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-yellow-300 mb-1">
                    Affluent API Response Time: Slow
                  </div>
                  <div className="text-sm text-yellow-200/80 mb-3">
                    The Affluent API typically has high latency (600-800ms per request). This is normal behavior for this network. Your data will load shortly.
                  </div>
                  {onRetry && (
                    <Button
                      size="sm"
                      onClick={onRetry}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Retry Connection
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// Simple Chart Skeleton Component for quick loads
interface ChartSkeletonProps {
  title?: string
  dataType?: 'daily' | 'hourly'
  className?: string
}

export function ChartSkeleton({ 
  title = 'Daily Performance Trends', 
  dataType = 'daily',
  className = '' 
}: ChartSkeletonProps) {
  return (
    <Card className={`bg-neutral-900 border-neutral-800 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] relative overflow-hidden bg-neutral-800/50 rounded-lg">
          {/* Chart skeleton animation */}
          <div className="absolute inset-4">
            {/* Y-axis */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-700" />
            
            {/* X-axis */}
            <div className="absolute left-0 bottom-0 right-0 h-px bg-neutral-700" />
            
            {/* Chart lines */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.path
                d="M 10,80 Q 25,60 40,65 T 70,45 T 90,50"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <motion.path
                d="M 10,90 Q 25,75 40,80 T 70,60 T 90,65"
                fill="none"
                stroke="#ec4899"
                strokeWidth="0.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
              />
            </svg>
            
            {/* Data points */}
            {Array.from({ length: dataType === 'hourly' ? 6 : 4 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-neutral-600 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  bottom: `${30 + Math.random() * 40}%`
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.5 }}
                transition={{ delay: i * 0.2, duration: 0.3 }}
              />
            ))}
          </div>
          
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-700/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
