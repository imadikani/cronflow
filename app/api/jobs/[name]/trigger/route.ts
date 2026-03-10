export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { triggerJob } from '@/lib/scheduler'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await params

  try {
    const run = await triggerJob(name)
    return NextResponse.json(run)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
