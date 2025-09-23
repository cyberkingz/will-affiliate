'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const handleInvitation = async () => {
      let accessToken = searchParams.get('access_token')
      let refreshToken = searchParams.get('refresh_token')
      let type = searchParams.get('type')

      if ((!accessToken || !refreshToken || type !== 'invite') && typeof window !== 'undefined') {
        const hash = window.location.hash.slice(1)
        if (hash) {
          const hashParams = new URLSearchParams(hash)
          accessToken = accessToken ?? hashParams.get('access_token')
          refreshToken = refreshToken ?? hashParams.get('refresh_token')
          type = type ?? hashParams.get('type')
        }
      }

      if (!accessToken || !refreshToken || type !== 'invite') {
        toast.error('Invalid invitation link')
        router.push('/auth/login')
        return
      }

      try {
        // Set the session temporarily to get user info
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          toast.error('Invalid invitation link')
          router.push('/auth/login')
          return
        }

        // Get user info
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('User error:', userError)
          toast.error('Unable to process invitation')
          router.push('/auth/login')
          return
        }

        setUserEmail(user.email || '')
        setUserName(user.user_metadata?.full_name || '')
        setIsLoading(false)

      } catch (error) {
        console.error('Error processing invitation:', error)
        toast.error('Error processing invitation')
        router.push('/auth/login')
      }
    }

    handleInvitation()
  }, [searchParams, router, supabase])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSettingPassword(true)

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        toast.error('Failed to set password')
        return
      }

      // Check if profile exists, create if not
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          // Create profile if it doesn't exist
          await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || '',
              role: user.user_metadata?.role || 'staff'
            })
        }
      }

      toast.success('Password set successfully! Welcome to the platform.')
      router.push('/dashboard')

    } catch (error) {
      console.error('Error setting password:', error)
      toast.error('Failed to set password')
    } finally {
      setIsSettingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-300">Processing invitation...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-neutral-900 border-neutral-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">Complete Your Registration</CardTitle>
          <CardDescription className="text-neutral-400">
            Welcome {userName}! Please set your password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-neutral-800 border-neutral-700 text-neutral-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-200">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password (min. 6 characters)"
                required
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-neutral-200">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-white text-black hover:bg-gray-100"
              disabled={isSettingPassword}
            >
              {isSettingPassword ? 'Setting Password...' : 'Complete Registration'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
