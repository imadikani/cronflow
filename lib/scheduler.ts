import cron from 'node-cron'
import { loadJobs, type JobConfig } from './parser'
import { runJob } from './executor'
import { prisma } from './prisma'

let _limit: ((fn: () => Promise<unknown>) => Promise<unknown>) | null = null

async function getLimit() {
  if (!_limit) {
    const { default: pLimit } = await import('p-limit')
    const limiter = pLimit(10)
    _limit = (fn) => limiter(fn)
  }
  return _limit
}

const runningJobs = new Set<string>()
const tasks = new Map<string, ReturnType<typeof cron.schedule>>()
let schedulerRunning = false

function nextRunDate(): Date {
  return new Date(Date.now() + 60_000)
}

function registerJob(job: JobConfig) {
  // Remove existing task if any
  const existing = tasks.get(job.name)
  if (existing) {
    existing.stop()
    tasks.delete(job.name)
  }

  const task = cron.schedule(
    job.cronExpression,
    async () => {
      if (runningJobs.has(job.name)) {
        console.log(`[cronflow] Skipping ${job.name} — already running`)
        return
      }
      runningJobs.add(job.name)
      try {
        const limit = await getLimit()
        await limit(() => runJob(job, 'CRON'))
      } finally {
        runningJobs.delete(job.name)
      }
    },
    { timezone: job.timezone }
  )

  tasks.set(job.name, task)
  console.log(`[cronflow] Scheduled "${job.name}" — ${job.cronExpression} (${job.timezone})`)
}

function unregisterJob(jobName: string) {
  const existing = tasks.get(jobName)
  if (existing) {
    existing.stop()
    tasks.delete(jobName)
    console.log(`[cronflow] Unregistered "${jobName}"`)
  }
}

export async function startScheduler() {
  if (schedulerRunning) return
  schedulerRunning = true

  const jobs = loadJobs()
  console.log(`[cronflow] Starting scheduler with ${jobs.length} jobs`)

  for (const job of jobs) {
    if (!job.enabled) continue

    registerJob(job)

    try {
      await prisma.jobState.upsert({
        where: { jobName: job.name },
        create: {
          jobName: job.name,
          enabled: job.enabled,
          nextRunAt: nextRunDate(),
        },
        update: {
          nextRunAt: nextRunDate(),
        },
      })
    } catch {
      // DB might not be available at startup
    }
  }
}

export async function enableJob(jobName: string) {
  const jobs = loadJobs()
  const job = jobs.find(j => j.name === jobName)
  if (!job) throw new Error(`Job not found: ${jobName}`)

  registerJob(job)

  await prisma.jobState.upsert({
    where: { jobName },
    create: { jobName, enabled: true, nextRunAt: nextRunDate() },
    update: { enabled: true, nextRunAt: nextRunDate() },
  })

  return { jobName, enabled: true }
}

export async function disableJob(jobName: string) {
  const jobs = loadJobs()
  const job = jobs.find(j => j.name === jobName)
  if (!job) throw new Error(`Job not found: ${jobName}`)

  unregisterJob(jobName)

  await prisma.jobState.upsert({
    where: { jobName },
    create: { jobName, enabled: false },
    update: { enabled: false, nextRunAt: null },
  })

  return { jobName, enabled: false }
}

export async function triggerJob(jobName: string) {
  const jobs = loadJobs()
  const job = jobs.find(j => j.name === jobName)
  if (!job) throw new Error(`Job not found: ${jobName}`)
  return runJob(job, 'MANUAL')
}

export function isSchedulerRunning() {
  return schedulerRunning
}

export function getTaskCount() {
  return tasks.size
}
