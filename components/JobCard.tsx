'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'

interface JobData {
  name: string
  description: string
  schedule: string
  enabled: boolean
  lastRunAt: string | null
  lastStatus: string | null
  nextRunAt: string | null
  runCount: number
  failureCount: number
  isRunning: boolean
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function JobCard({ job, onRefresh }: { job: JobData; apiKey?: string; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false)

  async function handleAction(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    const action = job.isRunning ? 'stop' : 'start'
    try {
      await fetch(`/api/jobs/${job.name}/${action}`, { method: 'POST' })
      await onRefresh()
      setTimeout(onRefresh, 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-[#1e1a2e] border border-[#7c5cbf]/20 rounded-xl p-5 flex flex-col gap-3 hover:border-[#7c5cbf]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/jobs/${job.name}`} className="text-[#e8e0ff] font-semibold text-sm hover:text-[#c4b5f4] transition-colors">
            {job.name}
          </Link>
          <p className="text-[#8b7db5] text-xs mt-0.5 leading-relaxed">{job.description}</p>
        </div>
        <StatusBadge status={job.lastStatus} runCount={job.runCount} nextRunAt={job.nextRunAt} />
      </div>

      <div className="text-xs text-[#8b7db5] space-y-1">
        <div className="flex justify-between">
          <span>Schedule</span>
          <span className="text-[#c4b5f4]">{job.schedule}</span>
        </div>
        <div className="flex justify-between">
          <span>Last run</span>
          <span className="text-[#e8e0ff]">{relativeTime(job.lastRunAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Next run</span>
          <span className="text-[#e8e0ff]">{formatTime(job.nextRunAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Runs / Failures</span>
          <span className="text-[#e8e0ff]">{job.runCount} / <span className="text-[#f87171]">{job.failureCount}</span></span>
        </div>
      </div>

      <button
        onClick={handleAction}
        disabled={busy}
        className={`mt-1 w-full py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 border ${
          job.isRunning
            ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
        }`}
      >
        {busy ? '...' : job.isRunning ? '⏹ Stop' : '▶ Start'}
      </button>
    </div>
  )
}
