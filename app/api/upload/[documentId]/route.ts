import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params

  const doc = await db.clientDocument.findUnique({ where: { id: documentId } })
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  await db.clientDocument.delete({ where: { id: documentId } })

  return NextResponse.json({ success: true })
}
