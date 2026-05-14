import { NextRequest } from "next/server"
import { runTranslationPipeline } from "@/lib/pipeline/translation-pipeline"
import { getTranslationMemory } from "@/lib/db/translation-memory"
import { db } from "@/lib/db/client"
import type { PipelineInput } from "@/lib/pipeline/types"

export const runtime = "nodejs"
export const maxDuration = 120 // 2 min timeout for Railway

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    clientId: string
    sourceText: string
    sourceLang: string
    targetLang: string
    contentType: string
    documentFileIds?: string[]
  }

  // Load client config + translation memory
  const client = await db.client.findUnique({
    where: { id: body.clientId },
    include: { documents: true },
  })

  if (!client) {
    return new Response(JSON.stringify({ error: "Client not found" }), { status: 404 })
  }

  const translationMemory = await getTranslationMemory(
    body.clientId,
    body.sourceLang,
    body.targetLang
  )

  const input: PipelineInput = {
    sourceText: body.sourceText,
    sourceLang: body.sourceLang,
    targetLang: body.targetLang,
    contentType: body.contentType,
    clientId: body.clientId,
    toneOfVoice: (client.toneOfVoice as Record<string, unknown>) ?? undefined,
    audienceProfile: (client.audienceProfile as Record<string, unknown>) ?? undefined,
    documentFileIds: body.documentFileIds ?? client.documents.map((d) => d.anthropicFileId),
    translationMemory,
  }

  // Return SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(event: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        for await (const event of runTranslationPipeline(input)) {
          send(event)
        }
      } catch (error) {
        send({
          stage: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          retryable: false,
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
