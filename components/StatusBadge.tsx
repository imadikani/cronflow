interface StatusBadgeProps {
  status: string | null
}

const styles: Record<string, string> = {
  SUCCESS: 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30',
  FAILURE: 'bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/30',
  RUNNING: 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30',
  PENDING: 'bg-[#8b7db5]/15 text-[#8b7db5] border border-[#8b7db5]/30',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const s = status ?? 'PENDING'
  const cls = styles[s] ?? styles.PENDING
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {s === 'RUNNING' && (
        <span className="w-1.5 h-1.5 bg-[#fbbf24] rounded-full mr-1.5 animate-pulse" />
      )}
      {s}
    </span>
  )
}
