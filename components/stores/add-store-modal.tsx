'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import type { AddStoreFormData, StoreStatus, ShopifyStore } from './types'

interface AddStoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStoreCreated: (storeData: Omit<ShopifyStore, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function AddStoreModal({
  open,
  onOpenChange,
  onStoreCreated
}: AddStoreModalProps) {
  const [formData, setFormData] = useState<AddStoreFormData>({
    storeName: '',
    storeUrl: '',
    shopifyEmail: '',
    shopifyPassword: '',
    status: 'active'
  })
  const [storeId, setStoreId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<AddStoreFormData>>({})

  // Construct full Shopify URL from store ID
  const constructShopifyUrl = (storeId: string): string => {
    const cleanStoreId = storeId.trim().toLowerCase()
    if (!cleanStoreId) return ''
    
    // Remove any existing .myshopify.com if user added it
    const baseStoreId = cleanStoreId.replace(/\.myshopify\.com.*$/, '')
    
    return `https://${baseStoreId}.myshopify.com`
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<AddStoreFormData> = {}

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Store name is required'
    }

    if (!storeId.trim()) {
      newErrors.storeUrl = 'Store ID is required'
    } else if (!isValidStoreId(storeId)) {
      newErrors.storeUrl = 'Store ID can only contain letters, numbers, and hyphens'
    }

    if (!formData.shopifyEmail.trim()) {
      newErrors.shopifyEmail = 'Shopify email is required'
    } else if (!isValidEmail(formData.shopifyEmail)) {
      newErrors.shopifyEmail = 'Please enter a valid email address'
    }

    if (!formData.shopifyPassword.trim()) {
      newErrors.shopifyPassword = 'Shopify password is required'
    } else if (formData.shopifyPassword.length < 6) {
      newErrors.shopifyPassword = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidStoreId = (storeId: string): boolean => {
    const cleanStoreId = storeId.trim().toLowerCase()
    // Allow letters, numbers, and hyphens (typical Shopify store naming rules)
    const storeIdPattern = /^[a-z0-9-]+$/
    return storeIdPattern.test(cleanStoreId) && cleanStoreId.length >= 2 && cleanStoreId.length <= 60
  }

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Create store data with constructed URL
    const constructedUrl = constructShopifyUrl(storeId)
    const storeData = {
      storeName: formData.storeName.trim(),
      storeUrl: constructedUrl,
      shopifyEmail: formData.shopifyEmail.trim(),
      shopifyPassword: formData.shopifyPassword.trim(),
      status: formData.status
    }

    onStoreCreated(storeData)
    
    // Reset form
    setFormData({
      storeName: '',
      storeUrl: '',
      shopifyEmail: '',
      shopifyPassword: '',
      status: 'active'
    })
    setStoreId('')
    setErrors({})
    setShowPassword(false)
  }

  const handleCancel = () => {
    setFormData({
      storeName: '',
      storeUrl: '',
      shopifyEmail: '',
      shopifyPassword: '',
      status: 'active'
    })
    setStoreId('')
    setErrors({})
    setShowPassword(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Shopify Store</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Radio Buttons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as StoreStatus }))}
                  className="w-4 h-4 text-blue-600 bg-neutral-800 border-neutral-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-200">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as StoreStatus }))}
                  className="w-4 h-4 text-blue-600 bg-neutral-800 border-neutral-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-200">Inactive</span>
              </label>
            </div>
          </div>

          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="storeName" className="text-sm font-medium">
              Store Name
            </Label>
            <Input
              id="storeName"
              value={formData.storeName}
              onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
              className={`bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 ${
                errors.storeName ? 'border-red-500' : ''
              }`}
              placeholder="Enter store name"
            />
            {errors.storeName && (
              <p className="text-red-400 text-xs">{errors.storeName}</p>
            )}
          </div>

          {/* Store ID */}
          <div className="space-y-2">
            <Label htmlFor="storeId" className="text-sm font-medium">
              Shopify Store ID
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="storeId"
                  type="text"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className={`bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 pr-32 ${
                    errors.storeUrl ? 'border-red-500' : ''
                  }`}
                  placeholder="your-store-name"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">
                  .myshopify.com
                </div>
              </div>
              {storeId && (
                <div className="px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-md text-neutral-300 text-sm">
                  <span className="text-neutral-400">Full URL:</span> {constructShopifyUrl(storeId)}
                </div>
              )}
            </div>
            {errors.storeUrl && (
              <p className="text-red-400 text-xs">{errors.storeUrl}</p>
            )}
            {!errors.storeUrl && (
              <p className="text-neutral-500 text-xs">Enter only your store name (letters, numbers, and hyphens)</p>
            )}
          </div>

          {/* Shopify Email */}
          <div className="space-y-2">
            <Label htmlFor="shopifyEmail" className="text-sm font-medium">
              Shopify Email Account
            </Label>
            <Input
              id="shopifyEmail"
              type="email"
              value={formData.shopifyEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, shopifyEmail: e.target.value }))}
              className={`bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 ${
                errors.shopifyEmail ? 'border-red-500' : ''
              }`}
              placeholder="admin@yourstore.com"
            />
            {errors.shopifyEmail && (
              <p className="text-red-400 text-xs">{errors.shopifyEmail}</p>
            )}
          </div>

          {/* Shopify Password */}
          <div className="space-y-2">
            <Label htmlFor="shopifyPassword" className="text-sm font-medium">
              Shopify Password
            </Label>
            <div className="relative">
              <Input
                id="shopifyPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.shopifyPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, shopifyPassword: e.target.value }))}
                className={`bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-400 pr-10 ${
                  errors.shopifyPassword ? 'border-red-500' : ''
                }`}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.shopifyPassword && (
              <p className="text-red-400 text-xs">{errors.shopifyPassword}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              ADD STORE
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}