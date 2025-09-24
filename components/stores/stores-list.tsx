'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  MoreVertical, 
  ExternalLink, 
  Power, 
  PowerOff, 
  Trash2, 
  Store, 
  Eye, 
  EyeOff,
  Copy, 
  ChevronDown, 
  ChevronRight,
  User,
  Lock,
  Globe 
} from 'lucide-react'
import type { ShopifyStore } from './types'

interface StoresListProps {
  stores: ShopifyStore[]
  onDeleteStore: (storeId: string) => void
  onToggleStatus: (storeId: string) => void
  onViewDetails: (store: ShopifyStore) => void
  searchQuery: string
}

export function StoresList({ 
  stores, 
  onDeleteStore, 
  onToggleStatus,
  onViewDetails,
  searchQuery 
}: StoresListProps) {
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set())
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const toggleExpansion = (storeId: string) => {
    setExpandedStores(prev => {
      const newSet = new Set(prev)
      if (newSet.has(storeId)) {
        newSet.delete(storeId)
      } else {
        newSet.add(storeId)
      }
      return newSet
    })
  }

  const togglePasswordVisibility = (storeId: string) => {
    setShowPasswords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(storeId)) {
        newSet.delete(storeId)
      } else {
        newSet.add(storeId)
      }
      return newSet
    })
  }

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const getStatusBadgeVariant = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'default' : 'secondary'
  }

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'text-green-400' : 'text-neutral-400'
  }

  // Show empty state when no stores match the current filters
  if (stores.length === 0) {
    return (
      <Card className="bg-neutral-800/50 border-neutral-700">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-neutral-700/50 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchQuery ? 'No stores found' : 'No stores found'}
          </h3>
          <p className="text-neutral-400 mb-4 max-w-md">
            {searchQuery 
              ? `No stores match your search for "${searchQuery}". Try adjusting your search terms or filters.`
              : 'Add your first Shopify store to get started.'
            }
          </p>
          {!searchQuery && (
            <p className="text-neutral-500 text-sm">
              Connect your Shopify stores to start tracking affiliate marketing performance.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Credentials display component
  const renderCredentials = (store: ShopifyStore, isExpanded: boolean) => {
    if (!isExpanded) return null

    return (
      <div className="px-4 pb-4 bg-neutral-800/30 border-t border-neutral-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
          {/* Store URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Globe className="h-4 w-4" />
              Store URL
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono">
                {store.storeUrl}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(store.storeUrl, `url-${store.id}`)}
                      className="h-8 w-8 text-neutral-400 hover:text-white"
                    >
                      <Copy className={`h-3 w-3 ${copiedField === `url-${store.id}` ? 'text-green-400' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                    {copiedField === `url-${store.id}` ? 'Copied!' : 'Copy URL'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <User className="h-4 w-4" />
              Shopify Email
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono">
                {store.shopifyEmail}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(store.shopifyEmail, `email-${store.id}`)}
                      className="h-8 w-8 text-neutral-400 hover:text-white"
                    >
                      <Copy className={`h-3 w-3 ${copiedField === `email-${store.id}` ? 'text-green-400' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                    {copiedField === `email-${store.id}` ? 'Copied!' : 'Copy Email'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Lock className="h-4 w-4" />
              Shopify Password
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono">
                {showPasswords.has(store.id) ? store.shopifyPassword : '•'.repeat(store.shopifyPassword.length)}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePasswordVisibility(store.id)}
                      className="h-8 w-8 text-neutral-400 hover:text-white"
                    >
                      {showPasswords.has(store.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                    {showPasswords.has(store.id) ? 'Hide Password' : 'Show Password'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(store.shopifyPassword, `password-${store.id}`)}
                      className="h-8 w-8 text-neutral-400 hover:text-white"
                    >
                      <Copy className={`h-3 w-3 ${copiedField === `password-${store.id}` ? 'text-green-400' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                    {copiedField === `password-${store.id}` ? 'Copied!' : 'Copy Password'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card className="bg-neutral-800/50 border-neutral-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left p-4 text-neutral-300 font-medium w-8"></th>
                    <th className="text-left p-4 text-neutral-300 font-medium">Store Name</th>
                    <th className="text-left p-4 text-neutral-300 font-medium">URL</th>
                    <th className="text-left p-4 text-neutral-300 font-medium">Status</th>
                    <th className="text-left p-4 text-neutral-300 font-medium">Last Updated</th>
                    <th className="text-left p-4 text-neutral-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store, index) => {
                    const isExpanded = expandedStores.has(store.id)
                    return (
                      <React.Fragment key={store.id}>
                        <tr 
                          className={`
                            ${index !== stores.length - 1 && !isExpanded ? 'border-b border-neutral-700/50' : ''} 
                            hover:bg-neutral-700/20 cursor-pointer transition-colors
                            ${isExpanded ? 'bg-neutral-700/10' : ''}
                            focus-within:bg-neutral-700/20 focus-within:outline-none
                          `}
                          onClick={() => toggleExpansion(store.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleExpansion(store.id)
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${store.storeName}`}
                        >
                          <td className="p-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-neutral-400 hover:text-white transition-transform"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-white">{store.storeName}</div>
                            <div className="text-sm text-neutral-400">{store.shopifyEmail}</div>
                          </td>
                          <td className="p-4">
                            <a
                              href={store.storeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {store.storeUrl.replace('https://', '')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={getStatusBadgeVariant(store.status)}
                              className={`${getStatusColor(store.status)} capitalize`}
                            >
                              {store.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-neutral-300 text-sm">
                            {formatDate(store.updatedAt)}
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onViewDetails(store)}
                                      className="h-8 w-8 text-neutral-400 hover:text-white"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                    View Details Modal
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-neutral-800 border-neutral-700" align="end">
                                  <DropdownMenuItem
                                    onClick={() => onToggleStatus(store.id)}
                                    className="text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                                  >
                                    {store.status === 'active' ? (
                                      <>
                                        <PowerOff className="h-4 w-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Power className="h-4 w-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-400 hover:bg-neutral-700 cursor-pointer"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Store
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-neutral-900 border-neutral-800">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">Delete Store</AlertDialogTitle>
                                        <AlertDialogDescription className="text-neutral-400">
                                          Are you sure you want to delete &quot;{store.storeName}&quot;? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => onDeleteStore(store.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete Store
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              {renderCredentials(store, isExpanded)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {stores.map((store) => {
          const isExpanded = expandedStores.has(store.id)
          return (
            <Card 
              key={store.id} 
              className={`bg-neutral-800/50 border-neutral-700 transition-all duration-200 ${isExpanded ? 'bg-neutral-700/30' : ''}`}
            >
              <CardContent className="p-0">
                {/* Main card content - clickable */}
                <div 
                  className="p-4 space-y-3 cursor-pointer focus-within:outline-none"
                  onClick={() => toggleExpansion(store.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpansion(store.id)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${store.storeName}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{store.storeName}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-neutral-400 hover:text-white transition-transform"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-neutral-400 mt-1">{store.shopifyEmail}</p>
                    </div>
                    <div 
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onViewDetails(store)}
                              className="h-8 w-8 text-neutral-400 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                            View Details Modal
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-neutral-800 border-neutral-700" align="end">
                          <DropdownMenuItem
                            onClick={() => onToggleStatus(store.id)}
                            className="text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                          >
                            {store.status === 'active' ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-400 hover:bg-neutral-700 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Store
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-neutral-900 border-neutral-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Store</AlertDialogTitle>
                                <AlertDialogDescription className="text-neutral-400">
                                  Are you sure you want to delete &quot;{store.storeName}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteStore(store.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Store
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <a
                      href={store.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {store.storeUrl.replace('https://', '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Badge 
                      variant={getStatusBadgeVariant(store.status)}
                      className={`${getStatusColor(store.status)} capitalize`}
                    >
                      {store.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-700">
                    Last updated: {formatDate(store.updatedAt)}
                  </div>
                </div>

                {/* Expanded credentials section */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-neutral-800/30 border-t border-neutral-700">
                    <div className="space-y-4 pt-4">
                      {/* Store URL */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <Globe className="h-4 w-4" />
                          Store URL
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono break-all">
                            {store.storeUrl}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(store.storeUrl, `mobile-url-${store.id}`)}
                                  className="h-8 w-8 text-neutral-400 hover:text-white"
                                >
                                  <Copy className={`h-3 w-3 ${copiedField === `mobile-url-${store.id}` ? 'text-green-400' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                {copiedField === `mobile-url-${store.id}` ? 'Copied!' : 'Copy URL'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <User className="h-4 w-4" />
                          Shopify Email
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono break-all">
                            {store.shopifyEmail}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(store.shopifyEmail, `mobile-email-${store.id}`)}
                                  className="h-8 w-8 text-neutral-400 hover:text-white"
                                >
                                  <Copy className={`h-3 w-3 ${copiedField === `mobile-email-${store.id}` ? 'text-green-400' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                {copiedField === `mobile-email-${store.id}` ? 'Copied!' : 'Copy Email'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <Lock className="h-4 w-4" />
                          Shopify Password
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono">
                            {showPasswords.has(store.id) ? store.shopifyPassword : '•'.repeat(store.shopifyPassword.length)}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => togglePasswordVisibility(store.id)}
                                  className="h-8 w-8 text-neutral-400 hover:text-white"
                                >
                                  {showPasswords.has(store.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                {showPasswords.has(store.id) ? 'Hide Password' : 'Show Password'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(store.shopifyPassword, `mobile-password-${store.id}`)}
                                  className="h-8 w-8 text-neutral-400 hover:text-white"
                                >
                                  <Copy className={`h-3 w-3 ${copiedField === `mobile-password-${store.id}` ? 'text-green-400' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-neutral-800 border-neutral-700 text-neutral-300">
                                {copiedField === `mobile-password-${store.id}` ? 'Copied!' : 'Copy Password'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}