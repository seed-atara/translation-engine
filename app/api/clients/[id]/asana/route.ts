import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import crypto from "crypto"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const body = (await req.json()) as {
    accessToken: string
    workspaceGid: string
    projectGid: string
  }

  if (!body.accessToken?.trim() || !body.workspaceGid?.trim() || !body.projectGid?.trim()) {
    return NextResponse.json({ error: "accessToken, workspaceGid, and projectGid are required" }, { status: 400 })
  }

  // Validate the token against Asana's /users/me endpoint
  let asanaUserId: string
  try {
    const asanaRes = await fetch("https://app.asana.com/api/1.0/users/me", {
      headers: {
        Authorization: `Bearer ${body.accessToken.trim()}`,
        Accept: "application/json",
      },
    })

    if (!asanaRes.ok) {
      return NextResponse.json(
        { error: "Invalid Asana Personal Access Token. Please check and try again." },
        { status: 422 }
      )
    }

    const asanaData = (await asanaRes.json()) as { data: { gid: string } }
    asanaUserId = asanaData.data.gid
  } catch {
    return NextResponse.json(
      { error: "Could not reach Asana. Check your network connection and try again." },
      { status: 502 }
    )
  }

  // Validate the client exists
  const client = await db.client.findUnique({ where: { id } })
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Generate a webhook secret if this is a new config
  const existing = await db.asanaConfig.findUnique({ where: { clientId: id } })
  const webhookSecret = existing?.webhookSecret ?? crypto.randomBytes(32).toString("hex")

  const config = await db.asanaConfig.upsert({
    where: { clientId: id },
    create: {
      clientId: id,
      accessToken: body.accessToken.trim(),
      workspaceGid: body.workspaceGid.trim(),
      projectGid: body.projectGid.trim(),
      webhookSecret,
    },
    update: {
      accessToken: body.accessToken.trim(),
      workspaceGid: body.workspaceGid.trim(),
      projectGid: body.projectGid.trim(),
    },
  })

  // Suppress unused variable lint warning — asanaUserId confirms token validity
  void asanaUserId

  return NextResponse.json({ success: true, workspaceGid: config.workspaceGid })
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const existing = await db.asanaConfig.findUnique({ where: { clientId: id } })
  if (!existing) {
    return NextResponse.json({ error: "No Asana config found" }, { status: 404 })
  }

  await db.asanaConfig.delete({ where: { clientId: id } })

  return NextResponse.json({ success: true })
}
