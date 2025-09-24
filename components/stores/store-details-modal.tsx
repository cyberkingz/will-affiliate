'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Eye, EyeOff, ExternalLink } from 'lucide-react'
import type { ShopifyStore } from './types'

interface StoreDetailsModalProps {
  store: ShopifyStore | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StoreDetailsModal({ store, open, onOpenChange }: StoreDetailsModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!store) return null

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(date)
  }

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            Store Details
            <Badge 
              variant="outline" 
              className={`capitalize ${getStatusColor(store.status)}`}
            >
              {store.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Store Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Store Name</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white">
                {store.storeName}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(store.storeName, 'storeName')}
                className="h-9 w-9 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                <Copy className={`h-4 w-4 ${copiedField === 'storeName' ? 'text-green-400' : 'text-neutral-400'}`} />
              </Button>
            </div>
          </div>

          {/* Store URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Store URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white">
                {store.storeUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(store.storeUrl, 'storeUrl')}
                className="h-9 w-9 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                <Copy className={`h-4 w-4 ${copiedField === 'storeUrl' ? 'text-green-400' : 'text-neutral-400'}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(store.storeUrl, '_blank')}
                className="h-9 w-9 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                <ExternalLink className="h-4 w-4 text-neutral-400" />
              </Button>
            </div>
          </div>

          {/* Shopify Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Shopify Email Account</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white">
                {store.shopifyEmail}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(store.shopifyEmail, 'shopifyEmail')}
                className="h-9 w-9 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                <Copy className={`h-4 w-4 ${copiedField === 'shopifyEmail' ? 'text-green-400' : 'text-neutral-400'}`} />
              </Button>
            </div>
          </div>

          {/* Shopify Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Shopify Password</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white font-mono">
                {showPassword ? (store.shopifyPassword || 'No password set') : '•'.repeat((store.shopifyPassword || '').length)}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="h-9 w-9 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-neutral-400" />
                ) : (
                  <Eye className="h-4 w-4 text-neutral-400" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(store.shopifyPassword || '', 'shopifyPassword')}
                className="h-9 w-9 border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
                disabled={!store.shopifyPassword}
              >
                <Copy className={`h-4 w-4 ${copiedField === 'shopifyPassword' ? 'text-green-400' : 'text-neutral-400'}`} />
              </Button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-700">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Created At</label>
              <div className="px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-md text-neutral-300 text-sm">
                {formatDate(store.createdAt)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Last Updated</label>
              <div className="px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-md text-neutral-300 text-sm">
                {formatDate(store.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-neutral-700">
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}