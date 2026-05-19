import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { saveCorrection } from "@/lib/db/translation-memory"

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    approvedText: z.string(),
    correctionType: z
      .enum(["LANGUAGE", "CULTURAL", "TONE", "TERMINOLOGY", "SAFETY"])
      .optional(),
    editorNote: z.string().optional(),
  }),
  z.object({
    action: z.literal("reject"),
  }),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const job = await db.translationJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      clientId: true,
      sourceLang: true,
      targetLang: true,
      sourceText: true,
      translatedText: true,
    },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const { data } = parsed

  if (data.action === "approve") {
    // If the editor changed the translation, save a correction to translation memory
    const wasEdited =
      data.approvedText &&
      job.translatedText &&
      data.approvedText.trim() !== job.translatedText.trim()

    if (wasEdited && data.correctionType) {
      await saveCorrection({
        jobId: job.id,
        clientId: job.clientId,
        sourceLang: job.sourceLang,
        targetLang: job.targetLang,
        sourceText: job.sourceText,
        originalTrans: job.translatedText!,
        correctedTrans: data.approvedText,
        correctionType: data.correctionType,
        editorNote: data.editorNote,
        source: "REVIEW_UI",
      })
    }

    const updated = await db.translationJob.update({
      where: { id: jobId },
      data: {
        status: "APPROVED",
        approvedText: data.approvedText,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true },
    })

    return NextResponse.json(updated)
  }

  // reject
  const updated = await db.translationJob.update({
    where: { id: jobId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
    },
    select: { id: true, status: true },
  })

  return NextResponse.json(updated)
}
