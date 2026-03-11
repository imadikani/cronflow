'use client'

import { useEffect, useState, useCallback } from 'react'
import JobCard from '@/components/JobCard'

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
  isRunning: boolean
}

function MoroccoTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Casablanca',
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="text-[#8b7db5] text-sm">{time}</span>
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<JobData[]>([])
  const [loading, setLoading] = useState(true)
  const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? ''

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data)
    } catch {
      // silently retry on next interval
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    const id = setInterval(fetchJobs, 10_000)
    return () => clearInterval(id)
  }, [fetchJobs])

  const runningNow = jobs.filter(j => j.isRunning).length
  const failedToday = jobs.filter(j => {
    if (j.lastStatus !== 'FAILURE' || !j.lastRunAt) return false
    const d = new Date(j.lastRunAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length
  const successRate = jobs.length
    ? Math.round(jobs.filter(j => j.lastStatus === 'SUCCESS').length / jobs.length * 100)
    : 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-light text-[#e8e0ff]">Dashboard</h2>
        <MoroccoTime />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Jobs', value: jobs.length },
          { label: 'Running Now', value: runningNow, color: '#fbbf24' },
          { label: 'Failed Today', value: failedToday, color: '#f87171' },
          { label: 'Success Rate', value: `${successRate}%`, color: '#4ade80' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1e1a2e] border border-[#7c5cbf]/20 rounded-xl p-5">
            <p className="text-[#8b7db5] text-xs mb-1">{stat.label}</p>
            <p className="text-2xl font-light" style={{ color: stat.color ?? '#e8e0ff' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Job Grid */}
      {loading ? (
        <div className="text-[#8b7db5] text-sm">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-[#8b7db5] text-sm">No jobs configured. Add jobs to jobs.toml to get started.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {jobs.map(job => (
            <JobCard key={job.name} job={job} apiKey={apiKey} onRefresh={fetchJobs} />
          ))}
        </div>
      )}
    </div>
  )
}
