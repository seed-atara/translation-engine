import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name: string
    technicalDomain?: string
    targetLanguages?: string[]
    toneOfVoice?: Record<string, unknown> | null
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 })
  }

  const agency = await db.agency.findFirst()
  if (!agency) {
    return NextResponse.json({ error: "No agency found — run db:seed first" }, { status: 500 })
  }

  const slug = body.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const client = await db.client.create({
    data: {
      name: body.name.trim(),
      slug,
      technicalDomain: body.technicalDomain?.trim() ?? null,
      targetLanguages: body.targetLanguages ?? [],
      toneOfVoice: (body.toneOfVoice ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      agencyId: agency.id,
    },
  })

  return NextResponse.json({ id: client.id }, { status: 201 })
}
