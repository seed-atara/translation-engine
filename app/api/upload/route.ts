import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db/client"
import { DocumentType } from "@prisma/client"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DOCUMENT_TYPE_VALUES = [
  "BRAND_GUIDELINES",
  "TONE_OF_VOICE",
  "GLOSSARY",
  "REFERENCE_MATERIAL",
  "EXAMPLE_COPY",
] as const

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const file = formData.get("file") as File | null
  const clientId = formData.get("clientId") as string | null
  const documentType = formData.get("documentType") as string | null

  if (!file || !clientId || !documentType) {
    return NextResponse.json(
      { error: "Missing required fields: file, clientId, documentType" },
      { status: 400 }
    )
  }

  if (!DOCUMENT_TYPE_VALUES.includes(documentType as DocumentType)) {
    return NextResponse.json({ error: "Invalid documentType" }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, DOCX, TXT" },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB" },
      { status: 400 }
    )
  }

  const client = await db.client.findUnique({ where: { id: clientId } })
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const uploadedFile = await anthropic.beta.files.upload(
    {
      file: new File([buffer], file.name, { type: file.type }),
    },
    { headers: { "anthropic-beta": "files-api-2025-04-14" } }
  )

  const doc = await db.clientDocument.create({
    data: {
      clientId,
      name: file.name,
      type: documentType as DocumentType,
      anthropicFileId: uploadedFile.id,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  })

  return NextResponse.json({ fileId: uploadedFile.id, documentId: doc.id })
}
