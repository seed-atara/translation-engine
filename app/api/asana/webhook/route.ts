import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { db } from "@/lib/db/client"
import { saveCorrection } from "@/lib/db/translation-memory"

export async function POST(req: NextRequest) {
  // Asana handshake: first delivery contains X-Hook-Secret to echo back
  const hookSecret = req.headers.get("x-hook-secret")
  if (hookSecret) {
    return new NextResponse(null, {
      status: 200,
      headers: { "x-hook-secret": hookSecret },
    })
  }

  // Validate HMAC signature on subsequent deliveries
  const signature = req.headers.get("x-hook-signature")
  const rawBody = await req.text()

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }

  // Look up Asana config by matching webhook signature
  // In practice, store clientId in a custom header or URL param
  const clientId = req.nextUrl.searchParams.get("clientId")
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 })
  }

  const asanaConfig = await db.asanaConfig.findUnique({ where: { clientId } })
  if (!asanaConfig) {
    return NextResponse.json({ error: "No Asana config" }, { status: 404 })
  }

  const expectedSig = createHmac("sha256", asanaConfig.webhookSecret)
    .update(rawBody)
    .digest("hex")

  if (signature !== expectedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as {
    events: Array<{
      type: string
      resource: { resource_type: string; gid: string }
      parent?: { gid: string }
    }>
  }

  // Process story events (comments = editor corrections)
  for (const event of payload.events) {
    if (event.type === "added" && event.resource.resource_type === "story") {
      await processStoryEvent(event.resource.gid, clientId, asanaConfig.accessToken)
    }
  }

  return NextResponse.json({ processed: payload.events.length })
}

async function processStoryEvent(storyGid: string, clientId: string, token: string) {
  try {
    const res = await fetch(`https://app.asana.com/api/1.0/stories/${storyGid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return

    const { data } = (await res.json()) as {
      data: {
        type: string
        text: string
        resource_subtype: string
        target: { gid: string }
      }
    }

    // Only process edit comments that look like corrections
    if (data.type !== "comment" || !data.text.includes("CORRECTION:")) return

    // Parse correction format: "CORRECTION: [original] → [corrected]"
    const match = /CORRECTION:\s*\[([\s\S]+?)\]\s*→\s*\[([\s\S]+?)\]/.exec(data.text)
    if (!match) return

    const [, originalTrans, correctedTrans] = match

    // Find the job linked to this Asana task
    const job = await db.translationJob.findFirst({
      where: { asanaTaskGid: data.target.gid, clientId },
    })

    if (!job) return

    await saveCorrection({
      jobId: job.id,
      clientId,
      sourceLang: job.sourceLang,
      targetLang: job.targetLang,
      sourceText: job.sourceText,
      originalTrans: originalTrans ?? "",
      correctedTrans: correctedTrans ?? "",
      correctionType: "LANGUAGE",
      source: "ASANA_WEBHOOK",
    })
  } catch {
    // Non-fatal: log and continue
    console.error(`Failed to process Asana story ${storyGid}`)
  }
}
