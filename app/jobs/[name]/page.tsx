'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'

interface JobData {
  name: string
  description: string
  schedule: string
  cronExpression: string
  webhook: string
  timezone: string
  enabled: boolean
  lastRunAt: string | null
  lastStatus: string | null
  nextRunAt: string | null
  runCount: number
  failureCount: number
}

interface JobRun {
  id: string
  jobName: string
  status: string
  triggeredBy: string
  startedAt: string
  finishedAt: string | null
  duration: number | null
  output: string | null
  error: string | null
  attempt: number
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function JobDetailPage() {
  const { name } = useParams<{ name: string }>()
  const [job, setJob] = useState<JobData | null>(null)
  const [history, setHistory] = useState<JobRun[]>([])
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? ''

  const fetchData = useCallback(async () => {
    const [jobsRes, histRes] = await Promise.all([
      fetch('/api/jobs'),
      fetch(`/api/jobs/${name}/history`),
    ])
    const jobs: JobData[] = await jobsRes.json()
    const found = jobs.find(j => j.name === name) ?? null
    setJob(found)
    setHistory(await histRes.json())
  }, [name])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 10_000)
    return () => clearInterval(id)
  }, [fetchData])

  async function handleTrigger() {
    setTriggering(true)
    try {
      await fetch(`/api/jobs/${name}/trigger`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
      })
      setTimeout(fetchData, 1000)
    } finally {
      setTriggering(false)
    }
  }

  if (!job) return <div className="p-8 text-[#8b7db5]">Loading...</div>

  return (
    <div className="p-8 max-w-5xl">
      {/* Job Metadata */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-light text-[#e8e0ff]">{job.name}</h2>
          <p className="text-[#8b7db5] text-sm mt-1">{job.description}</p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="px-4 py-2 rounded-lg bg-[#7c5cbf] text-white text-sm font-medium hover:bg-[#9b7de0] transition-colors disabled:opacity-50"
        >
          {triggering ? 'Triggering...' : 'Run now'}
        </button>
      </div>

      <div className="bg-[#1e1a2e] border border-[#7c5cbf]/20 rounded-xl p-6 mb-8 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        {[
          { label: 'Schedule', value: job.schedule },
          { label: 'Cron Expression', value: job.cronExpression },
          { label: 'Timezone', value: job.timezone },
          { label: 'Webhook', value: job.webhook },
          { label: 'Retry', value: String(job.cronExpression) },
          { label: 'Status', value: job.lastStatus ?? 'NEW' },
          { label: 'Total Runs', value: String(job.runCount) },
          { label: 'Failures', value: String(job.failureCount) },
        ].map(row => (
          <div key={row.label} className="flex gap-2">
            <span className="text-[#8b7db5] w-36 shrink-0">{row.label}</span>
            <span className="text-[#e8e0ff] break-all">{row.value}</span>
          </div>
        ))}
      </div>

      {/* History Table */}
      <h3 className="text-lg font-light text-[#e8e0ff] mb-4">Run History</h3>
      <div className="bg-[#1e1a2e] border border-[#7c5cbf]/20 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#7c5cbf]/20">
              {['Status', 'Triggered By', 'Started At', 'Duration', 'Attempt'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[#8b7db5] font-normal text-xs uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map(run => (
              <>
                <tr
                  key={run.id}
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  className="border-b border-[#7c5cbf]/10 hover:bg-[#7c5cbf]/5 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-5 py-3 text-[#8b7db5]">{run.triggeredBy}</td>
                  <td className="px-5 py-3 text-[#e8e0ff]">{formatDate(run.startedAt)}</td>
                  <td className="px-5 py-3 text-[#e8e0ff]">{formatDuration(run.duration)}</td>
                  <td className="px-5 py-3 text-[#8b7db5]">{run.attempt}</td>
                </tr>
                {expandedRun === run.id && (
                  <tr key={`${run.id}-expand`} className="border-b border-[#7c5cbf]/10 bg-[#16131f]">
                    <td colSpan={5} className="px-5 py-4">
                      {run.output && (
                        <div className="mb-3">
                          <p className="text-[#8b7db5] text-xs mb-1 uppercase tracking-wider">Output</p>
                          <pre className="text-[#4ade80] text-xs font-mono bg-black/30 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                            {run.output}
                          </pre>
                        </div>
                      )}
                      {run.error && (
                        <div>
                          <p className="text-[#8b7db5] text-xs mb-1 uppercase tracking-wider">Error</p>
                          <pre className="text-[#f87171] text-xs font-mono bg-black/30 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                            {run.error}
                          </pre>
                        </div>
                      )}
                      {!run.output && !run.error && (
                        <p className="text-[#8b7db5] text-xs">No output recorded.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#8b7db5] text-sm">
                  No runs yet. Trigger this job to see history.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
