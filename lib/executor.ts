import axios from 'axios'
import { prisma } from './prisma'
import type { JobConfig } from './parser'

// Track active abort controllers per job so we can cancel mid-flight
const activeControllers = new Map<string, AbortController>()

async function notifyFailure(job: JobConfig, error: string) {
  if (!job.notifyOnFailure.length) return
  console.error(`[cronflow] Notify failure for ${job.name}:`, error)
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

export function isJobRunning(jobName: string): boolean {
  return activeControllers.has(jobName)
}

export function getRunningJobs(): string[] {
  return [...activeControllers.keys()]
}

export function cancelJob(jobName: string): boolean {
  const controller = activeControllers.get(jobName)
  if (!controller) return false
  controller.abort()
  console.log(`[cronflow] Cancelled running job "${jobName}"`)
  return true
}

export async function runJob(
  job: JobConfig,
  triggeredBy: 'CRON' | 'MANUAL'
): Promise<{ id: string; jobName: string; status: string; triggeredBy: string; startedAt: Date; finishedAt: Date | null; duration: number | null; output: string | null; error: string | null; attempt: number }> {
  // Create an AbortController for this run
  const controller = new AbortController()
  activeControllers.set(job.name, controller)

  const run = await prisma.jobRun.create({
    data: {
      jobName: job.name,
      status: 'RUNNING',
      triggeredBy,
    },
  })

  await prisma.jobState.upsert({
    where: { jobName: job.name },
    create: { jobName: job.name, enabled: job.enabled, lastStatus: 'RUNNING' },
    update: { lastStatus: 'RUNNING' },
  })

  let lastError = ''
  let output = ''
  let status = 'FAILURE'
  const startedAt = run.startedAt
  let attempt = 1
  const maxAttempts = job.retry + 1

  try {
    for (attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check if cancelled before each attempt
      if (controller.signal.aborted) {
        lastError = 'Job cancelled'
        status = 'FAILURE'
        break
      }

      try {
        const response = await axios.post(
          job.webhook,
          { jobName: job.name, triggeredBy, timestamp: new Date().toISOString() },
          {
            timeout: job.timeout * 1000,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-cronflow-job': job.name,
              ...job.headers,
            },
            validateStatus: (s) => s >= 200 && s < 300,
          }
        )
        output = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        status = 'SUCCESS'
        lastError = ''
        break
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = 'Job cancelled'
          status = 'FAILURE'
          break
        }
        if (axios.isCancel(err)) {
          lastError = 'Job cancelled'
          status = 'FAILURE'
          break
        }
        lastError = err instanceof Error ? err.message : String(err)
        if (attempt < maxAttempts) {
          console.warn(`[cronflow] ${job.name} attempt ${attempt} failed, retrying in 5s...`)
          try {
            await sleep(5000, controller.signal)
          } catch {
            lastError = 'Job cancelled during retry wait'
            status = 'FAILURE'
            break
          }
        }
      }
    }
  } finally {
    // Always clean up the controller
    activeControllers.delete(job.name)
  }

  const finishedAt = new Date()
  const duration = finishedAt.getTime() - startedAt.getTime()

  const updated = await prisma.jobRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt,
      duration,
      output: output || null,
      error: lastError || null,
      attempt,
    },
  })

  await prisma.jobState.upsert({
    where: { jobName: job.name },
    create: {
      jobName: job.name,
      enabled: job.enabled,
      lastRunAt: finishedAt,
      lastStatus: status,
      runCount: 1,
      failureCount: status === 'FAILURE' ? 1 : 0,
    },
    update: {
      lastRunAt: finishedAt,
      lastStatus: status,
      runCount: { increment: 1 },
      failureCount: status === 'FAILURE' ? { increment: 1 } : undefined,
    },
  })

  if (status === 'FAILURE' && lastError !== 'Job cancelled') {
    await notifyFailure(job, lastError)
  }

  return updated
}
