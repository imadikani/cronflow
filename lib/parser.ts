import fs from 'fs'
import path from 'path'
import TOML from '@iarna/toml'
import { toCronExpression } from './cron-renderer'

export interface JobConfig {
  name: string
  description: string
  schedule: string
  cronExpression: string
  webhook: string
  timezone: string
  enabled: boolean
  retry: number
  timeout: number
  notifyOnFailure: string[]
  headers?: Record<string, string>
  startTime?: string
  stopTime?: string
}

interface RawJob {
  description?: string
  schedule?: string
  webhook?: string
  timezone?: string
  enabled?: boolean
  retry?: number
  timeout?: number
  notify_on_failure?: string[]
  headers?: Record<string, string>
  start_time?: string
  stop_time?: string
}

interface TomlConfig {
  jobs?: Record<string, RawJob>
}

export function loadJobs(): JobConfig[] {
  const tomlPath = path.join(process.cwd(), 'jobs.toml')
  const raw = fs.readFileSync(tomlPath, 'utf-8')
  const config = TOML.parse(raw) as TomlConfig

  if (!config.jobs) return []

  return Object.entries(config.jobs).map(([name, job]) => {
    const schedule = job.schedule ?? ''
    return {
      name,
      description: job.description ?? '',
      schedule,
      cronExpression: toCronExpression(schedule),
      webhook: job.webhook ?? '',
      timezone: job.timezone ?? 'UTC',
      enabled: job.enabled ?? true,
      retry: job.retry ?? 0,
      timeout: job.timeout ?? 30,
      notifyOnFailure: job.notify_on_failure ?? [],
      headers: job.headers,
      startTime: job.start_time,
      stopTime: job.stop_time,
    }
  })
}
