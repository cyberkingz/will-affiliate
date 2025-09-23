import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const type = searchParams.get('type')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle invitation flow (access_token + refresh_token)
  if (accessToken && refreshToken && type === 'invite') {
    // Redirect to invitation acceptance page with the tokens
    const invitationUrl = new URL('/auth/accept-invitation', origin)
    invitationUrl.searchParams.set('access_token', accessToken)
    invitationUrl.searchParams.set('refresh_token', refreshToken)
    invitationUrl.searchParams.set('type', 'invite')
    
    return NextResponse.redirect(invitationUrl.toString())
  }

  // Handle regular OAuth flow (code)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Authentication+failed`)
}