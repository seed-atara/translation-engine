import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { Prisma } from "@prisma/client"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const body = (await req.json()) as {
    name?: string
    technicalDomain?: string | null
    targetLanguages?: string[]
    toneOfVoice?: { description?: string } | null
    audienceProfile?: { description?: string } | null
  }

  const existing = await db.client.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Rebuild slug only if name changed
  const slug =
    body.name && body.name.trim() !== existing.name
      ? body.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      : existing.slug

  const updated = await db.client.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim(), slug }),
      ...(body.technicalDomain !== undefined && {
        technicalDomain: body.technicalDomain?.trim() ?? null,
      }),
      ...(body.targetLanguages !== undefined && { targetLanguages: body.targetLanguages }),
      ...(body.toneOfVoice !== undefined && {
        toneOfVoice: (body.toneOfVoice ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      }),
      ...(body.audienceProfile !== undefined && {
        audienceProfile: (body.audienceProfile ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const existing = await db.client.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  await db.client.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
