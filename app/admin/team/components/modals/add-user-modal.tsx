'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { NetworkConnection } from '../types/team.types'

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableNetworks: NetworkConnection[]
  onUserCreated: (userData: any) => void
}

export function AddUserModal({
  open,
  onOpenChange,
  availableNetworks,
  onUserCreated
}: AddUserModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'analyst' as 'admin' | 'manager' | 'analyst',
    networkAccess: [] as string[]
  })

  const handleSubmit = () => {
    onUserCreated(formData)
    setFormData({
      email: '',
      fullName: '',
      role: 'analyst',
      networkAccess: []
    })
    setStep(1)
  }

  const handleNetworkToggle = (networkId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        networkAccess: [...prev.networkAccess, networkId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        networkAccess: prev.networkAccess.filter(id => id !== networkId)
      }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Progress */}
          <div className="flex items-center justify-between">
            {[1, 2].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex items-center ${stepNumber < 2 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-700 text-neutral-400'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 2 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      step > stepNumber ? 'bg-blue-600' : 'bg-neutral-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="bg-neutral-800 border-neutral-700"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-neutral-800 border-neutral-700"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
                >
                  <SelectTrigger className="bg-neutral-800 border-neutral-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="analyst">Analyst - View access only</SelectItem>
                    <SelectItem value="manager">Manager - Campaign management</SelectItem>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Network Access & Review */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Affiliate Network Access</h3>
                <p className="text-neutral-400 text-sm">
                  Select which affiliate networks this user can access and manage campaigns for.
                </p>
                <div className="space-y-3">
                  {availableNetworks.map((network) => (
                    <div
                      key={network.id}
                      className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          network.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <div className="font-medium">{network.name}</div>
                          <div className="text-sm text-neutral-400">
                            {network.userCount} users have access • Status: {network.status}
                          </div>
                        </div>
                      </div>
                      <Checkbox
                        checked={formData.networkAccess.includes(network.id)}
                        onCheckedChange={(checked) => handleNetworkToggle(network.id, checked as boolean)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Review & Send Invitation</h3>
                <div className="bg-neutral-800 p-4 rounded-lg space-y-3">
                  <div><span className="text-neutral-400">Name:</span> <span className="text-white">{formData.fullName}</span></div>
                  <div><span className="text-neutral-400">Email:</span> <span className="text-white">{formData.email}</span></div>
                  <div><span className="text-neutral-400">Role:</span> <span className="text-white capitalize">{formData.role}</span></div>
                  <div>
                    <span className="text-neutral-400">Networks:</span> 
                    <span className="text-white"> {formData.networkAccess.length} selected</span>
                    {formData.networkAccess.length > 0 && (
                      <div className="text-neutral-500 text-sm mt-1">
                        {formData.networkAccess.map(id => 
                          availableNetworks.find(n => n.id === id)?.name
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
              className="border-neutral-700 text-neutral-300"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {step === 3 ? 'Send Invitation' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}