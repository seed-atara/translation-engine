import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { saveCorrection } from "@/lib/db/translation-memory"

const CorrectionSchema = z.object({
  jobId: z.string(),
  segmentIndex: z.number().optional(),
  sourceText: z.string(),
  originalTrans: z.string(),
  correctedTrans: z.string(),
  correctionType: z.enum(["LANGUAGE", "CULTURAL", "TONE", "TERMINOLOGY", "SAFETY"]),
  editorNote: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CorrectionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data } = parsed

  const job = await db.translationJob.findUnique({
    where: { id: data.jobId },
    select: { clientId: true, sourceLang: true, targetLang: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const correction = await saveCorrection({
    jobId: data.jobId,
    clientId: job.clientId,
    sourceLang: job.sourceLang,
    targetLang: job.targetLang,
    sourceText: data.sourceText,
    originalTrans: data.originalTrans,
    correctedTrans: data.correctedTrans,
    correctionType: data.correctionType,
    editorNote: data.editorNote,
    source: "REVIEW_UI",
  })

  return NextResponse.json({ correctionId: correction.id })
}
