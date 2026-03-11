import cron from 'node-cron'
import { loadJobs, type JobConfig } from './parser'
import { runJob, cancelJob as cancelRunningJob, isJobRunning as checkJobRunning, getRunningJobs } from './executor'
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

const activeJobs = new Set<string>()
const tasks = new Map<string, ReturnType<typeof cron.schedule>>()
let schedulerRunning = false

function nextRunDate(): Date {
  return new Date(Date.now() + 60_000)
}

function registerJob(job: JobConfig) {
  const existing = tasks.get(job.name)
  if (existing) {
    existing.stop()
    tasks.delete(job.name)
  }

  const task = cron.schedule(
    job.cronExpression,
    async () => {
      if (activeJobs.has(job.name)) {
        console.log(`[cronflow] Skipping ${job.name} — already running`)
        return
      }
      activeJobs.add(job.name)
      try {
        const limit = await getLimit()
        await limit(() => runJob(job, 'CRON'))
      } finally {
        activeJobs.delete(job.name)
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

// Start button: trigger the job immediately
export async function startJob(jobName: string) {
  const jobs = loadJobs()
  const job = jobs.find(j => j.name === jobName)
  if (!job) throw new Error(`Job not found: ${jobName}`)

  // Re-enable cron schedule
  registerJob(job)

  // Mark enabled in DB
  await prisma.jobState.upsert({
    where: { jobName },
    create: { jobName, enabled: true, nextRunAt: nextRunDate() },
    update: { enabled: true, nextRunAt: nextRunDate() },
  })

  // Fire the job immediately in the background
  activeJobs.add(job.name)
  runJob(job, 'MANUAL')
    .finally(() => activeJobs.delete(job.name))
    .catch(err => console.error(`[cronflow] Manual run of ${jobName} failed:`, err))

  return { jobName, enabled: true, running: true }
}

// Stop button: cancel running execution + disable cron
export async function stopJob(jobName: string) {
  const jobs = loadJobs()
  const job = jobs.find(j => j.name === jobName)
  if (!job) throw new Error(`Job not found: ${jobName}`)

  // Cancel the in-flight execution if any
  const wasCancelled = cancelRunningJob(jobName)
  activeJobs.delete(jobName)

  // Remove from cron schedule
  unregisterJob(jobName)

  // Mark disabled in DB
  await prisma.jobState.upsert({
    where: { jobName },
    create: { jobName, enabled: false },
    update: { enabled: false, nextRunAt: null },
  })

  return { jobName, enabled: false, running: false, wasCancelled }
}

export async function triggerJob(jobName: string) {
  const jobs = loadJobs()
  const job = jobs.find(j => j.name === jobName)
  if (!job) throw new Error(`Job not found: ${jobName}`)
  return runJob(job, 'MANUAL')
}

export function isJobRunning(jobName: string): boolean {
  return checkJobRunning(jobName)
}

export function getAllRunningJobs(): string[] {
  return getRunningJobs()
}

export function isSchedulerRunning() {
  return schedulerRunning
}

export function getTaskCount() {
  return tasks.size
}
