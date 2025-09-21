'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { User, Settings, LogOut, RefreshCw } from 'lucide-react'
import { logout } from '@/app/auth/actions'

interface HeaderProps {
  user: {
    email: string
    full_name?: string | null
  }
  syncStatus?: {
    isActive: boolean
    lastSync?: string | null
  }
  onRefresh?: () => void
}

export function Header({ user, syncStatus, onRefresh }: HeaderProps) {
  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="border-b bg-neutral-900 border-neutral-800">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-neutral-50">
            Campaigns Insight
          </h1>
          {syncStatus && (
            <div className="flex items-center space-x-2">
              <Badge 
                variant={syncStatus.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {syncStatus.isActive ? 'Syncing' : 'Idle'}
              </Badge>
              {syncStatus.lastSync && (
                <span className="text-xs text-gray-500">
                  Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={syncStatus?.isActive}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}