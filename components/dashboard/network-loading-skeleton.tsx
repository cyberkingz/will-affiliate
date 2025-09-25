'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Network } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function NetworkLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="sr-only" aria-live="polite">Loading your available networks...</div>
      <Card className="max-w-2xl w-full bg-neutral-900/50 border-neutral-800 animate-in fade-in-0 duration-300">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-neutral-300 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-xl">Loading Networks</CardTitle>
              <CardDescription>
                Please wait while we load your available networks...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {/* Skeleton for network cards */}
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-neutral-900/50 border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-2 h-2 rounded-full bg-neutral-800" />
                    <Skeleton className="h-4 w-24 bg-neutral-800" />
                    <Skeleton className="h-5 w-16 rounded bg-neutral-800" />
                  </div>
                  <Skeleton className="w-5 h-5 rounded-full bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 space-y-4">
            <Skeleton className="w-full h-10 bg-neutral-800 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}