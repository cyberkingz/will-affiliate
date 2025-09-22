'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock, 
  Shield, 
  Zap,
  Database,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react'

export interface LoadingState {
  isLoading: boolean
  progress: number
  currentStep: string
  error: string | null
  canRetry: boolean
  timeElapsed: number
}

export interface LoadingError {
  type: 'network' | 'timeout' | 'api' | 'processing' | 'rate_limit' | 'authentication' | 'server_error'
  message: string
  details?: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  networkContext?: string
  suggestedAction?: string
  errorCode?: string
}

export interface NetworkStatus {
  isOnline: boolean
  latency?: number
  quality: 'excellent' | 'good' | 'poor' | 'offline'
  lastChecked: Date
}

// Enhanced loading hook with error handling
interface StartLoadingOptions {
  timeout?: number
  maxRetries?: number
  onProgress?: (step: string, progress: number) => void
}

export const useDataLoading = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    currentStep: '',
    error: null,
    canRetry: false,
    timeElapsed: 0
  })

  const [retryCount, setRetryCount] = useState(0)
  // Simulate data loading with real API integration
  const startLoading = useCallback(
    async <T,>(
      dataFetcher: () => Promise<T>,
      options: StartLoadingOptions = {}
    ): Promise<T> => {
      const { timeout = 30000, maxRetries = 3, onProgress } = options
    
      setLoadingState(prev => ({
        ...prev,
        isLoading: true,
        progress: 0,
        error: null,
        canRetry: false
      }))
    
      const startTimestamp = Date.now()
    
      // Progress tracking
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTimestamp
        setLoadingState(prev => ({
          ...prev,
          timeElapsed: Math.floor(elapsed / 1000)
        }))
      }, 1000)

      try {
      // Step 1: Connection
      setLoadingState(prev => ({ ...prev, currentStep: 'Connecting to network...', progress: 10 }))
      onProgress?.('Connecting to network...', 10)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 2: Data fetching
      setLoadingState(prev => ({ ...prev, currentStep: 'Fetching data...', progress: 40 }))
      onProgress?.('Fetching data...', 40)
      
      const data = await Promise.race([
        dataFetcher(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ])

      // Step 3: Processing
      setLoadingState(prev => ({ ...prev, currentStep: 'Processing data...', progress: 80 }))
      onProgress?.('Processing data...', 80)
      await new Promise(resolve => setTimeout(resolve, 300))

      // Step 4: Complete
      setLoadingState(prev => ({ ...prev, currentStep: 'Complete', progress: 100, isLoading: false }))
      onProgress?.('Complete', 100)
      
      clearInterval(progressInterval)
      setRetryCount(0)
      return data

      } catch (error) {
        clearInterval(progressInterval)

        const normalizedError = error instanceof Error ? error : new Error(String(error))
        const isTimeout = normalizedError.message.includes('timeout')
        const isNetwork = normalizedError.message.includes('fetch')

        const loadingError: LoadingError = {
          type: isTimeout ? 'timeout' : isNetwork ? 'network' : 'api',
          message: normalizedError.message,
          retryable: retryCount < maxRetries,
          severity: isTimeout ? 'medium' : 'high'
        }

        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          error: loadingError.message,
          canRetry: loadingError.retryable
        }))

        throw loadingError
      }
    }, [retryCount])

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    setLoadingState(prev => ({
      ...prev,
      error: null,
      canRetry: false
    }))
  }, [])

  const reset = useCallback(() => {
    setLoadingState({
      isLoading: false,
      progress: 0,
      currentStep: '',
      error: null,
      canRetry: false,
      timeElapsed: 0
    })
    setRetryCount(0)
  }, [])

  return {
    loadingState,
    startLoading,
    retry,
    reset,
    retryCount
  }
}

// Enhanced error classification
const classifyError = (error: string): LoadingError => {
  const lowerError = error.toLowerCase()
  
  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return {
      type: 'network',
      message: error,
      retryable: true,
      severity: 'high',
      networkContext: 'Connection failed',
      suggestedAction: 'Check your internet connection and try again',
      errorCode: 'NET_001'
    }
  }
  
  if (lowerError.includes('timeout')) {
    return {
      type: 'timeout', 
      message: error,
      retryable: true,
      severity: 'medium',
      networkContext: 'Request timed out',
      suggestedAction: 'Try a smaller date range or check network speed',
      errorCode: 'TIM_001'
    }
  }
  
  if (lowerError.includes('rate limit') || lowerError.includes('429')) {
    return {
      type: 'rate_limit',
      message: error,
      retryable: true,
      severity: 'medium',
      networkContext: 'API rate limit exceeded',
      suggestedAction: 'Wait a moment before retrying',
      errorCode: 'RATE_001'
    }
  }
  
  if (lowerError.includes('unauthorized') || lowerError.includes('401') || lowerError.includes('auth')) {
    return {
      type: 'authentication',
      message: error,
      retryable: false,
      severity: 'critical',
      networkContext: 'Authentication failed',
      suggestedAction: 'Check your API credentials and permissions',
      errorCode: 'AUTH_001'
    }
  }
  
  if (lowerError.includes('500') || lowerError.includes('server error')) {
    return {
      type: 'server_error',
      message: error,
      retryable: true,
      severity: 'high',
      networkContext: 'Server error',
      suggestedAction: 'This is a temporary server issue, please try again later',
      errorCode: 'SRV_001'
    }
  }
  
  // Default API error
  return {
    type: 'api',
    message: error,
    retryable: true,
    severity: 'medium',
    networkContext: 'API request failed',
    suggestedAction: 'Please try again or contact support if the issue persists',
    errorCode: 'API_001'
  }
}

// Enhanced error state component with sophisticated animations
export const LoadingErrorState: React.FC<{
  error: string
  onRetry?: () => void
  canRetry?: boolean
  retryCount?: number
  chartTitle: string
  networkStatus?: NetworkStatus
  onDismiss?: () => void
}> = ({ error, onRetry, canRetry = false, retryCount = 0, chartTitle, networkStatus, onDismiss }) => {
  const errorInfo = classifyError(error)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const handleRetry = async () => {
    if (!onRetry) return
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setTimeout(() => setIsRetrying(false), 1000)
    }
  }
  
  const getErrorIcon = () => {
    switch (errorInfo.type) {
      case 'network':
        return <WifiOff className="h-5 w-5" />
      case 'timeout':
        return <Clock className="h-5 w-5" />
      case 'rate_limit':
        return <Shield className="h-5 w-5" />
      case 'authentication':
        return <AlertTriangle className="h-5 w-5" />
      case 'server_error':
        return <Database className="h-5 w-5" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }
  
  const getSeverityColors = () => {
    switch (errorInfo.severity) {
      case 'critical':
        return {
          border: 'border-red-800/50',
          bg: 'bg-red-900/20',
          text: 'text-red-300',
          accent: 'text-red-400',
          button: 'border-red-600 text-red-300 hover:bg-red-600/20'
        }
      case 'high':
        return {
          border: 'border-orange-800/50',
          bg: 'bg-orange-900/20',
          text: 'text-orange-300',
          accent: 'text-orange-400',
          button: 'border-orange-600 text-orange-300 hover:bg-orange-600/20'
        }
      case 'medium':
        return {
          border: 'border-yellow-800/50',
          bg: 'bg-yellow-900/20',
          text: 'text-yellow-300',
          accent: 'text-yellow-400',
          button: 'border-yellow-600 text-yellow-300 hover:bg-yellow-600/20'
        }
      default:
        return {
          border: 'border-blue-800/50',
          bg: 'bg-blue-900/20',
          text: 'text-blue-300',
          accent: 'text-blue-400',
          button: 'border-blue-600 text-blue-300 hover:bg-blue-600/20'
        }
    }
  }
  
  const colors = getSeverityColors()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className={`${colors.border} ${colors.bg} relative overflow-hidden`}>
        {/* Animated background gradient */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r from-transparent via-${errorInfo.severity === 'critical' ? 'red' : errorInfo.severity === 'high' ? 'orange' : 'yellow'}-500/5 to-transparent`}
          animate={{ x: [-200, 200] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-3 ${colors.text}`}>
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={colors.accent}
              >
                {getErrorIcon()}
              </motion.div>
              <div>
                <div>{chartTitle} - Loading Failed</div>
                <div className="text-sm font-normal opacity-70">
                  Error Code: {errorInfo.errorCode}
                </div>
              </div>
            </CardTitle>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative">
          {/* Enhanced error details */}
          <motion.div 
            className={`bg-gradient-to-r from-neutral-800 to-neutral-800/80 rounded-lg p-4 border ${colors.border}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-start gap-4">
              <motion.div 
                className="flex-shrink-0 p-2 rounded-full bg-neutral-700/50"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  animate={{ 
                    rotate: errorInfo.type === 'network' ? [0, -10, 10, 0] : 0,
                    scale: errorInfo.type === 'timeout' ? [1, 1.1, 1] : 1
                  }}
                  transition={{ 
                    duration: errorInfo.type === 'timeout' ? 1 : 2,
                    repeat: Infinity
                  }}
                  className={colors.accent}
                >
                  {getErrorIcon()}
                </motion.div>
              </motion.div>
              
              <div className="flex-1">
                <h4 className={`font-medium ${colors.text} mb-2`}>
                  {errorInfo.networkContext}
                </h4>
                <p className={`text-sm ${colors.text} opacity-80 mb-3`}>
                  {error}
                </p>
                
                {retryCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-xs ${colors.accent} bg-neutral-800/50 px-2 py-1 rounded inline-block`}
                  >
                    Retry attempt #{retryCount}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Network status indicator */}
          {networkStatus && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {networkStatus.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-400" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-neutral-300">
                    Connection: {networkStatus.quality}
                  </span>
                </div>
                {networkStatus.latency && (
                  <span className="text-neutral-400">
                    {networkStatus.latency}ms
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Enhanced guidance with contextual suggestions */}
          <motion.div 
            className="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h5 className="text-sm font-medium text-neutral-200 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Suggested Actions
            </h5>
            
            <div className="space-y-3">
              {/* Primary suggestion */}
              <motion.div
                className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`text-sm font-medium ${colors.text} mb-1`}>
                  Recommended Fix
                </div>
                <div className="text-xs text-neutral-400">
                  {errorInfo.suggestedAction}
                </div>
              </motion.div>
              
              {/* Additional suggestions based on error type */}
              <div className="grid grid-cols-1 gap-2 text-xs text-neutral-400">
                {errorInfo.type === 'network' && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Check your internet connection
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Verify affiliate network API status
                    </div>
                  </>
                )}
                {errorInfo.type === 'timeout' && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Try a smaller date range
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Check network performance
                    </div>
                  </>
                )}
                {errorInfo.type === 'rate_limit' && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-400" />
                    Wait 60 seconds before retrying
                  </div>
                )}
                {errorInfo.type === 'authentication' && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Verify API credentials in settings
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Check account permissions
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                  Contact support if the issue persists
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced retry button */}
          {canRetry && errorInfo.retryable && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                onClick={handleRetry}
                variant="outline"
                disabled={isRetrying}
                className={`w-full ${colors.button} transition-all duration-200`}
              >
                <motion.div
                  animate={isRetrying ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: isRetrying ? Infinity : 0, ease: 'linear' }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                </motion.div>
                {isRetrying ? 'Retrying...' : 'Retry Loading Data'}
              </Button>
            </motion.div>
          )}
          
          {!errorInfo.retryable && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-sm text-neutral-400 p-3 bg-neutral-800/50 rounded-lg"
            >
              This error requires manual intervention. Please check your configuration or contact support.
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Enhanced loading timeout warning with smart recommendations
export const LoadingTimeoutWarning: React.FC<{
  timeElapsed: number
  expectedTime: number
  onCancel?: () => void
  dataComplexity?: {
    dataPoints: number
    networks: string[]
    dateRange: string
  }
}> = ({ timeElapsed, expectedTime, onCancel, dataComplexity }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  useEffect(() => {
    if (timeElapsed < expectedTime * 1.5) {
      setIsVisible(false)
      return
    }
    
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [timeElapsed, expectedTime])
  
  if (!isVisible) return null
  
  const getLoadingStage = () => {
    const multiplier = timeElapsed / expectedTime
    if (multiplier < 2) return { stage: 'slightly_slow', severity: 'low' }
    if (multiplier < 3) return { stage: 'slow', severity: 'medium' }
    return { stage: 'very_slow', severity: 'high' }
  }
  
  const { stage, severity } = getLoadingStage()
  
  const getRecommendations = () => {
    const recommendations = []
    
    if (dataComplexity?.dataPoints && dataComplexity.dataPoints > 100) {
      recommendations.push('Try a smaller date range to reduce data points')
    }
    
    if (dataComplexity?.networks && dataComplexity.networks.length > 2) {
      recommendations.push('Consider loading one network at a time')
    }
    
    if (timeElapsed > expectedTime * 3) {
      recommendations.push('Check your internet connection speed')
    }
    
    return recommendations
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="mt-4"
      >
        <div className={`rounded-lg p-4 border relative overflow-hidden ${
          severity === 'high' ? 'bg-red-900/30 border-red-800/50' :
          severity === 'medium' ? 'bg-orange-900/30 border-orange-800/50' :
          'bg-yellow-900/30 border-yellow-800/50'
        }`}>
          {/* Animated warning pulse */}
          <motion.div
            className={`absolute inset-0 ${
              severity === 'high' ? 'bg-red-500/5' :
              severity === 'medium' ? 'bg-orange-500/5' :
              'bg-yellow-500/5'
            }`}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="flex items-start gap-4 relative">
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`flex-shrink-0 mt-0.5 ${
                severity === 'high' ? 'text-red-400' :
                severity === 'medium' ? 'text-orange-400' :
                'text-yellow-400'
              }`}
            >
              {severity === 'high' ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </motion.div>
            
            <div className="flex-1">
              <motion.h4 
                className={`font-medium mb-2 ${
                  severity === 'high' ? 'text-red-200' :
                  severity === 'medium' ? 'text-orange-200' :
                  'text-yellow-200'
                }`}
                layout
              >
                {stage === 'very_slow' ? 'Unusually slow loading' :
                 stage === 'slow' ? 'Taking longer than expected' :
                 'Slightly slower than usual'}
              </motion.h4>
              
              <motion.p 
                className={`text-sm mb-3 ${
                  severity === 'high' ? 'text-red-300/80' :
                  severity === 'medium' ? 'text-orange-300/80' :
                  'text-yellow-300/80'
                }`}
                layout
              >
                Loading has taken {timeElapsed}s (expected ~{expectedTime}s). 
                {dataComplexity && (
                  <span className="block mt-1 text-xs opacity-75">
                    Processing {dataComplexity.dataPoints} data points from {dataComplexity.networks.length} network(s)
                  </span>
                )}
              </motion.p>
              
              {/* Smart recommendations */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 space-y-1"
                  >
                    {getRecommendations().map((rec, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="text-xs text-neutral-400 flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {rec}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex gap-2">
                {onCancel && (
                  <Button 
                    onClick={onCancel}
                    size="sm"
                    variant="outline"
                    className={`${
                      severity === 'high' ? 'border-red-600 text-red-300 hover:bg-red-600/20' :
                      severity === 'medium' ? 'border-orange-600 text-orange-300 hover:bg-orange-600/20' :
                      'border-yellow-600 text-yellow-300 hover:bg-yellow-600/20'
                    }`}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                )}
                
                <Button 
                  onClick={() => setShowDetails(!showDetails)}
                  size="sm"
                  variant="ghost"
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Enhanced network status indicator with quality metrics
export const NetworkStatusIndicator: React.FC<{
  isOnline: boolean
  className?: string
  networkStatus?: NetworkStatus
  showDetails?: boolean
}> = ({ isOnline, className = '', networkStatus, showDetails = false }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const getQualityColor = (quality: NetworkStatus['quality']) => {
    switch (quality) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-blue-400'
      case 'poor': return 'text-yellow-400'
      case 'offline': return 'text-red-400'
      default: return 'text-neutral-400'
    }
  }
  
  const getQualityIcon = (quality: NetworkStatus['quality']) => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />
    
    switch (quality) {
      case 'excellent':
      case 'good':
        return <Wifi className="h-3 w-3" />
      case 'poor':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Wifi className="h-3 w-3" />
    }
  }
  
  const status = networkStatus || {
    isOnline,
    quality: isOnline ? 'good' : 'offline',
    lastChecked: new Date()
  }
  
  return (
    <motion.div 
      className={`flex items-center gap-2 text-xs relative ${className}`}
      style={{ position: 'relative', zIndex: showTooltip ? 50 : 'auto' }}
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setShowTooltip(true)}
      onHoverEnd={() => setShowTooltip(false)}
    >
      <motion.div
        animate={{
          opacity: isOnline ? [0.7, 1, 0.7] : 1,
          scale: isOnline ? [1, 1.1, 1] : 1
        }}
        transition={{
          duration: isOnline ? 2 : 0,
          repeat: isOnline ? Infinity : 0
        }}
        className={getQualityColor(status.quality)}
      >
        {getQualityIcon(status.quality)}
      </motion.div>
      
      <span className={getQualityColor(status.quality)}>
        {isOnline ? (
          showDetails && status.latency ? 
            `${status.quality} (${status.latency}ms)` :
            status.quality
        ) : 'Offline'}
      </span>
      
      {/* Enhanced tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 5 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 5 }}
            className="absolute top-1/2 right-full -translate-y-1/2 mr-2 p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-[100] min-w-48 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Status:</span>
                <span className={getQualityColor(status.quality)}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {status.latency && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Latency:</span>
                  <span className="text-neutral-200">{status.latency}ms</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Quality:</span>
                <span className={getQualityColor(status.quality)}>
                  {status.quality}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Last checked:</span>
                <span className="text-neutral-200">
                  {status.lastChecked.toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            {/* Tooltip arrow pointing right */}
            <div className="absolute top-1/2 left-full -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-neutral-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Real-time network quality monitor hook
export const useNetworkStatus = () => {
  const isClient = typeof navigator !== 'undefined'
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: isClient ? navigator.onLine : true,
    quality: 'good',
    lastChecked: new Date()
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateNetworkStatus = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        lastChecked: new Date()
      }))
    }
    
    // Measure connection quality periodically
    const measureLatency = async () => {
      if (!navigator.onLine) {
        setNetworkStatus(prev => ({ ...prev, quality: 'offline' }))
        return
      }
      
      try {
        const start = Date.now()
        // Use a lightweight endpoint for latency testing
        await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        const latency = Date.now() - start
        
        let quality: NetworkStatus['quality']
        if (latency < 100) quality = 'excellent'
        else if (latency < 300) quality = 'good'
        else quality = 'poor'
        
        setNetworkStatus(prev => ({
          ...prev,
          latency,
          quality,
          lastChecked: new Date()
        }))
      } catch {
        setNetworkStatus(prev => ({ ...prev, quality: 'poor' }))
      }
    }
    
    // Event listeners for online/offline
    const handleOnline = () => {
      updateNetworkStatus()
      measureLatency()
    }
    
    const handleOffline = () => {
      updateNetworkStatus()
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initial measurement
    measureLatency()
    
    // Periodic quality checks
    const interval = setInterval(measureLatency, 30000) // Every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])
  
  return networkStatus
}
