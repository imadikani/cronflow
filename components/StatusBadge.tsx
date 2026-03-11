'use client'

interface StatusBadgeProps {
  status: string | null
  runCount?: number
  nextRunAt?: string | null
}

const styles: Record<string, string> = {
  SUCCESS: 'bg-green-500/20 text-green-400 border border-green-500/30',
  FAILURE: 'bg-red-500/20 text-red-400 border border-red-500/30',
  FAILED: 'bg-red-500/20 text-red-400 border border-red-500/30',
  RUNNING: 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30',
  NEW: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  'NOT RUN': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
}

export function resolveStatus(
  lastStatus: string | null,
  runCount: number,
  nextRunAt: string | null
): string {
  if (lastStatus === 'RUNNING') return 'RUNNING'

  if (runCount === 0 && !lastStatus) {
    // Check if nextRunAt is more than 10 minutes in the past
    if (nextRunAt) {
      const next = new Date(nextRunAt).getTime()
      const tenMinAgo = Date.now() - 10 * 60 * 1000
      if (next < tenMinAgo) return 'NOT RUN'
    }
    return 'NEW'
  }

  if (lastStatus === 'SUCCESS') return 'SUCCESS'
  if (lastStatus === 'FAILURE' || lastStatus === 'FAILED') return 'FAILED'

  return 'NEW'
}

export default function StatusBadge({ status, runCount = 0, nextRunAt = null }: StatusBadgeProps) {
  const s = resolveStatus(status, runCount, nextRunAt)
  const cls = styles[s] ?? styles.NEW
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {s === 'RUNNING' && (
        <span className="w-1.5 h-1.5 bg-[#fbbf24] rounded-full mr-1.5 animate-pulse" />
      )}
      {s}
    </span>
  )
}
