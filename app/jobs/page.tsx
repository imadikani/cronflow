'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

interface JobData {
  name: string
  description: string
  schedule: string
  cronExpression: string
  enabled: boolean
  lastRunAt: string | null
  lastStatus: string | null
  nextRunAt: string | null
  runCount: number
  failureCount: number
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    const res = await fetch('/api/jobs')
    const data = await res.json()
    setJobs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchJobs()
    const id = setInterval(fetchJobs, 10_000)
    return () => clearInterval(id)
  }, [fetchJobs])

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
                {['Name', 'Schedule', 'Status', 'Runs', 'Failures', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[#8b7db5] font-normal text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.name} className="border-b border-[#7c5cbf]/10 hover:bg-[#7c5cbf]/5 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-[#e8e0ff] font-medium">{job.name}</p>
                    <p className="text-[#8b7db5] text-xs mt-0.5">{job.description}</p>
                  </td>
                  <td className="px-5 py-4 text-[#c4b5f4]">{job.schedule}</td>
                  <td className="px-5 py-4"><StatusBadge status={job.lastStatus} /></td>
                  <td className="px-5 py-4 text-[#e8e0ff]">{job.runCount}</td>
                  <td className="px-5 py-4 text-[#f87171]">{job.failureCount}</td>
                  <td className="px-5 py-4">
                    <Link href={`/jobs/${job.name}`} className="text-[#c4b5f4] text-xs hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
