import axios from 'axios'
import { prisma } from './prisma'
import type { JobConfig } from './parser'

async function notifyFailure(job: JobConfig, error: string) {
  if (!job.notifyOnFailure.length) return
  // Placeholder: send email via nodemailer or webhook
  console.error(`[cronflow] Notify failure for ${job.name}:`, error)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function runJob(
  job: JobConfig,
  triggeredBy: 'CRON' | 'MANUAL'
): Promise<{ id: string; jobName: string; status: string; triggeredBy: string; startedAt: Date; finishedAt: Date | null; duration: number | null; output: string | null; error: string | null; attempt: number }> {
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

  for (attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        job.webhook,
        { jobName: job.name, triggeredBy, timestamp: new Date().toISOString() },
        {
          timeout: job.timeout * 1000,
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
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < maxAttempts) {
        console.warn(`[cronflow] ${job.name} attempt ${attempt} failed, retrying in 5s...`)
        await sleep(5000)
      }
    }
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

  if (status === 'FAILURE') {
    await notifyFailure(job, lastError)
  }

  return updated
}
