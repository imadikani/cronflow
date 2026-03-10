export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  const runs = await prisma.jobRun.findMany({
    where: { jobName: name },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(runs)
}
