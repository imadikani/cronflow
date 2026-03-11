export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { enableJob } from '@/lib/scheduler'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  try {
    const result = await enableJob(name)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
