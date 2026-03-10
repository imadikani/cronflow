import cron from 'node-cron'
import { loadJobs } from './parser'
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

function nextRunDate(cronExpr: string, timezone: string): Date {
  // Approximate next run: parse cron and add to now
  // Using node-cron's internal logic isn't exposed, so we compute roughly
  const now = new Date()
  // For simplicity, add 1 minute and let node-cron handle it natively
  return new Date(now.getTime() + 60_000)
}

export async function startScheduler() {
  if (schedulerRunning) return
  schedulerRunning = true

  const jobs = loadJobs()
  console.log(`[cronflow] Starting scheduler with ${jobs.length} jobs`)

  for (const job of jobs) {
    if (!job.enabled) continue

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

    // Update nextRunAt in DB
    try {
      await prisma.jobState.upsert({
        where: { jobName: job.name },
        create: {
          jobName: job.name,
          enabled: job.enabled,
          nextRunAt: nextRunDate(job.cronExpression, job.timezone),
        },
        update: {
          nextRunAt: nextRunDate(job.cronExpression, job.timezone),
        },
      })
    } catch {
      // DB might not be available at startup; skip
    }

    console.log(`[cronflow] Scheduled "${job.name}" — ${job.cronExpression} (${job.timezone})`)
  }
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
