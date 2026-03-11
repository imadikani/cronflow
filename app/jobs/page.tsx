'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import LogsModal from '@/components/LogsModal'

interface JobData {
  name: string
  description: string
  schedule: string
  cronExpression: string
  enabled: boolean
  timezone: string
  startTime: string | null
  stopTime: string | null
  lastRunAt: string | null
  lastStatus: string | null
  nextRunAt: string | null
  runCount: number
  failureCount: number
  isRunning: boolean
}

function ScheduleDisplay({ job }: { job: JobData }) {
  const freq = job.schedule.charAt(0).toUpperCase() + job.schedule.slice(1)

  let timeWindow: string
  if (job.schedule.toLowerCase() === 'always') {
    timeWindow = 'Continuous'
  } else if (job.startTime && job.stopTime) {
    timeWindow = `${job.startTime} → ${job.stopTime} (${job.timezone})`
  } else {
    timeWindow = job.timezone
  }

  return (
    <div>
      <p className="text-[#c4b5f4] text-sm">{freq}</p>
      <p className="text-[#8b7db5] text-xs mt-0.5">{timeWindow}</p>
    </div>
  )
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobData[]>([])
  const [loading, setLoading] = useState(true)
  const [logsJob, setLogsJob] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data)
    } catch {
      // retry on next interval
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    const id = setInterval(fetchJobs, 10_000)
    return () => clearInterval(id)
  }, [fetchJobs])

  async function handleAction(jobName: string, action: 'start' | 'stop') {
    setActionLoading(prev => ({ ...prev, [jobName]: true }))
    try {
      await fetch(`/api/jobs/${jobName}/${action}`, { method: 'POST' })
      // Poll faster after action to reflect state change
      await fetchJobs()
      setTimeout(fetchJobs, 2000)
    } finally {
      setActionLoading(prev => ({ ...prev, [jobName]: false }))
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-light text-[#e8e0ff] mb-8">Jobs</h2>

      {loading ? (
        <p className="text-[#8b7db5] text-sm">Loading...</p>
      ) : (
        <div className="bg-[#1e1a2e] border border-[#7c5cbf]/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#7c5cbf]/20">
                {['Name', 'Schedule', 'Status', 'Runs', 'Failures', '', ''].map((h, i) => (
                  <th key={`${h}-${i}`} className="text-left px-5 py-3 text-[#8b7db5] font-normal text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const busy = actionLoading[job.name]
                return (
                  <tr key={job.name} className="border-b border-[#7c5cbf]/10 hover:bg-[#7c5cbf]/5 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-[#e8e0ff] font-medium">{job.name}</p>
                      <p className="text-[#8b7db5] text-xs mt-0.5">{job.description}</p>
                    </td>
                    <td className="px-5 py-4">
                      <ScheduleDisplay job={job} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        status={job.lastStatus}
                        runCount={job.runCount}
                        nextRunAt={job.nextRunAt}
                      />
                    </td>
                    <td className="px-5 py-4 text-[#e8e0ff]">{job.runCount}</td>
                    <td className="px-5 py-4 text-[#f87171]">{job.failureCount}</td>
                    <td className="px-5 py-4">
                      <Link href={`/jobs/${job.name}`} className="text-[#c4b5f4] text-xs hover:underline">
                        View →
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {job.isRunning ? (
                          <button
                            onClick={() => handleAction(job.name, 'stop')}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {busy ? '...' : '⏹ Stop'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(job.name, 'start')}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {busy ? '...' : '▶ Start'}
                          </button>
                        )}
                        <button
                          onClick={() => setLogsJob(job.name)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                        >
                          📋 Logs
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {logsJob && (
        <LogsModal jobName={logsJob} onClose={() => setLogsJob(null)} />
      )}
    </div>
  )
}
