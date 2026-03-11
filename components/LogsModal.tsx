'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface JobRun {
  id: string
  status: string
  triggeredBy: string
  startedAt: string
  finishedAt: string | null
  duration: number | null
  output: string | null
  error: string | null
  attempt: number
}

interface LogsModalProps {
  jobName: string
  onClose: () => void
}

function formatTimestamp(d: string): string {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function formatLine(run: JobRun): string {
  const ts = formatTimestamp(run.startedAt)
  const dur = run.duration ? `${run.duration}ms` : ''
  const detail = run.error || run.output || ''
  const preview = detail.length > 120 ? detail.slice(0, 120) + '...' : detail

  if (run.status === 'SUCCESS') {
    return `[${ts}] SUCCESS ${dur} — ${preview}`
  }
  if (run.status === 'FAILURE' || run.status === 'FAILED') {
    return `[${ts}] FAILED  ${dur ? dur + ' ' : ''}— ${preview}`
  }
  return `[${ts}] ${run.status.padEnd(7)} ${dur ? dur + ' ' : ''}— ${preview}`
}

export default function LogsModal({ jobName, onClose }: LogsModalProps) {
  const [runs, setRuns] = useState<JobRun[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLPreElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobName}/history`)
      const data: JobRun[] = await res.json()
      setRuns(data)
    } catch {
      // silently retry
    } finally {
      setLoading(false)
    }
  }, [jobName])

  useEffect(() => {
    fetchLogs()
    const id = setInterval(fetchLogs, 5_000)
    return () => clearInterval(id)
  }, [fetchLogs])

  // Auto-scroll to bottom when runs change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [runs])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reverse to show oldest first (log-style)
  const logRuns = [...runs].reverse()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="w-full h-full max-w-6xl max-h-[90vh] m-4 flex flex-col bg-[#0d0d0d] rounded-xl border border-[#7c5cbf]/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#7c5cbf]/20 bg-[#1e1a2e]/50">
          <h3 className="text-[#e8e0ff] text-sm font-medium">
            Logs — <span className="text-[#c4b5f4]">{jobName}</span>
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLogs}
              className="text-[#8b7db5] text-xs hover:text-[#c4b5f4] transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-[#8b7db5] hover:text-[#e8e0ff] text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Log output */}
        <pre
          ref={scrollRef}
          className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed"
        >
          {loading ? (
            <span className="text-[#8b7db5]">Loading logs...</span>
          ) : logRuns.length === 0 ? (
            <span className="text-[#8b7db5]">No log entries yet.</span>
          ) : (
            logRuns.map(run => {
              const isSuccess = run.status === 'SUCCESS'
              const isFailed = run.status === 'FAILURE' || run.status === 'FAILED'
              const color = isSuccess
                ? 'text-green-400'
                : isFailed
                  ? 'text-red-400'
                  : 'text-[#8b7db5]'
              return (
                <div key={run.id} className={color}>
                  {formatLine(run)}
                </div>
              )
            })
          )}
        </pre>
      </div>
    </div>
  )
}
