export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { loadJobs } from '@/lib/parser'
import { isSchedulerRunning, getTaskCount } from '@/lib/scheduler'

const startTime = Date.now()

export async function GET() {
  const jobs = loadJobs()
  return NextResponse.json({
    status: 'ok',
    jobCount: jobs.length,
    schedulerRunning: isSchedulerRunning(),
    taskCount: getTaskCount(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  })
}
