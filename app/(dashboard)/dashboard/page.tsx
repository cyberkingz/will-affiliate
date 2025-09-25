import { Suspense } from 'react'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-neutral-300">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
