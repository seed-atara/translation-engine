import { db } from "./client"
import type { PipelineInput } from "../pipeline/types"

const MAX_MEMORY_EXAMPLES = 5

export async function getTranslationMemory(
  clientId: string,
  sourceLang: string,
  targetLang: string
): Promise<PipelineInput["translationMemory"]> {
  const memories = await db.translationMemory.findMany({
    where: { clientId, sourceLang, targetLang },
    orderBy: [{ weight: "desc" }, { useCount: "desc" }],
    take: MAX_MEMORY_EXAMPLES,
  })

  // Increment useCount for selected memories
  if (memories.length > 0) {
    await db.translationMemory.updateMany({
      where: { id: { in: memories.map((m) => m.id) } },
      data: { useCount: { increment: 1 } },
    })
  }

  return memories.map((m) => ({
    sourcePattern: m.sourcePattern,
    preferredOutput: m.preferredOutput,
    correctionType: m.correctionType,
  }))
}

export async function saveCorrection(data: {
  jobId: string
  clientId: string
  sourceLang: string
  targetLang: string
  sourceText: string
  originalTrans: string
  correctedTrans: string
  correctionType: string
  editorNote?: string
  source?: "REVIEW_UI" | "ASANA_WEBHOOK"
}) {
  // Save the raw correction
  const correction = await db.editorCorrection.create({
    data: {
      jobId: data.jobId,
      sourceText: data.sourceText,
      originalTrans: data.originalTrans,
      correctedTrans: data.correctedTrans,
      targetLang: data.targetLang,
      correctionType: data.correctionType as never,
      editorNote: data.editorNote,
      source: (data.source ?? "REVIEW_UI") as never,
    },
  })

  // Check if this pattern already exists in memory
  const existing = await db.translationMemory.findFirst({
    where: {
      clientId: data.clientId,
      targetLang: data.targetLang,
      sourcePattern: data.sourceText,
    },
  })

  if (existing) {
    // Strengthen existing memory entry
    await db.translationMemory.update({
      where: { id: existing.id },
      data: {
        preferredOutput: data.correctedTrans,
        weight: { increment: 0.2 },
        correctionId: correction.id,
      },
    })
  } else {
    // Create new memory entry
    await db.translationMemory.create({
      data: {
        clientId: data.clientId,
        correctionId: correction.id,
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
        sourcePattern: data.sourceText,
        preferredOutput: data.correctedTrans,
        correctionType: data.correctionType as never,
      },
    })
  }

  return correction
}
