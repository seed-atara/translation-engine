import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { createTranslationTask } from "@/lib/asana/client"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const job = await db.translationJob.findUnique({
    where: { id: jobId },
    include: {
      client: {
        select: {
          name: true,
          asanaConfig: true,
        },
      },
    },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (!job.client.asanaConfig) {
    return NextResponse.json(
      {
        error: "Asana not configured",
        setupUrl: `/clients/${job.clientId}/asana`,
      },
      { status: 422 }
    )
  }

  const task = await createTranslationTask(job.client.asanaConfig, {
    ...job,
    client: { name: job.client.name },
  })

  await db.translationJob.update({
    where: { id: jobId },
    data: {
      asanaTaskGid: task.gid,
      asanaPushedAt: new Date(),
    },
  })

  return NextResponse.json({ taskUrl: task.permalink_url })
}
