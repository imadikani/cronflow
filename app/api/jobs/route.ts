export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { loadJobs } from '@/lib/parser'
import { prisma } from '@/lib/prisma'
import { getAllRunningJobs } from '@/lib/scheduler'

export async function GET() {
  const jobs = loadJobs()

  const states = await prisma.jobState.findMany()
  const stateMap = Object.fromEntries(states.map(s => [s.jobName, s]))
  const runningSet = new Set(getAllRunningJobs())

  const result = jobs.map(job => {
    const state = stateMap[job.name]
    const isRunning = runningSet.has(job.name)
    return {
      name: job.name,
      description: job.description,
      schedule: job.schedule,
      cronExpression: job.cronExpression,
      enabled: state?.enabled ?? job.enabled,
      webhook: job.webhook,
      timezone: job.timezone,
      startTime: job.startTime ?? null,
      stopTime: job.stopTime ?? null,
      lastRunAt: state?.lastRunAt ?? null,
      lastStatus: isRunning ? 'RUNNING' : (state?.lastStatus ?? null),
      nextRunAt: state?.nextRunAt ?? null,
      runCount: state?.runCount ?? 0,
      failureCount: state?.failureCount ?? 0,
      isRunning,
    }
  })

  return NextResponse.json(result)
}
