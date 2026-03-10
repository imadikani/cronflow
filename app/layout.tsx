import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { startScheduler } from '@/lib/scheduler'

// Start scheduler once on server boot
if (process.env.NODE_ENV !== 'test') {
  startScheduler().catch(err => console.error('[cronflow] Scheduler error:', err))
}

export const metadata: Metadata = {
  title: 'cronflow — Job Scheduler',
  description: 'Lightweight cron-based job scheduling dashboard by Mizane AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#16131f] text-[#e8e0ff] antialiased flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
