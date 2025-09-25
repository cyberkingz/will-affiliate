'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TeamUser } from '../types/team.types'

interface UserActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: TeamUser | null
  onClose: () => void
}

export function UserActivityModal({
  open,
  onOpenChange,
  user,
  onClose
}: UserActivityModalProps) {
  if (!user) return null

  const mockActivity = [
    { time: '10:30 AM', action: 'Logged in', details: 'Dashboard access' },
    { time: '11:15 AM', action: 'Viewed reports', details: 'Campaign analytics' },
    { time: '02:45 PM', action: 'Downloaded data', details: 'Click report export' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity Log - {user.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            {mockActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-neutral-800 rounded-lg">
                <div className="text-neutral-400 text-sm w-20">{activity.time}</div>
                <div className="flex-1">
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-neutral-400">{activity.details}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}