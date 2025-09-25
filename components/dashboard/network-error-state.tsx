'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface NetworkErrorStateProps {
  onRetry: () => void
  isRetrying?: boolean
}

export function NetworkErrorState({ onRetry, isRetrying = false }: NetworkErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="sr-only" aria-live="polite" role="alert">
        {isRetrying ? 'Retrying to load networks...' : 'Failed to load networks'}
      </div>
      <Card className="max-w-md w-full bg-neutral-900/50 border-neutral-800 animate-in fade-in-0 duration-300">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <CardTitle className="text-red-400">Failed to Load Networks</CardTitle>
          <CardDescription>
            We encountered an error while loading your networks. This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}