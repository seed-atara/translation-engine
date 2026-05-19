"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, FileText, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClientDocument, DocumentType } from "@prisma/client"

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  BRAND_GUIDELINES: "Brand Guidelines",
  TONE_OF_VOICE: "Tone of Voice",
  GLOSSARY: "Glossary",
  REFERENCE_MATERIAL: "Reference Material",
  EXAMPLE_COPY: "Example Copy",
}

const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  BRAND_GUIDELINES: "bg-indigo-950 text-indigo-400 border-indigo-900",
  TONE_OF_VOICE: "bg-purple-950 text-purple-400 border-purple-900",
  GLOSSARY: "bg-cyan-950 text-cyan-400 border-cyan-900",
  REFERENCE_MATERIAL: "bg-zinc-900 text-zinc-400 border-zinc-700",
  EXAMPLE_COPY: "bg-emerald-950 text-emerald-400 border-emerald-900",
}

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]

const ALLOWED_EXTENSIONS = ".pdf,.docx,.txt"
const MAX_SIZE_MB = 10

interface DocumentUploadProps {
  clientId: string
  initialDocuments: ClientDocument[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentUpload({ clientId, initialDocuments }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>(initialDocuments)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>("BRAND_GUIDELINES")
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File is too large. Maximum size is ${MAX_SIZE_MB} MB.`)
      setUploadState("error")
      return
    }
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    if (!allowed.includes(file.type)) {
      setErrorMessage("Invalid file type. Accepted: PDF, DOCX, TXT.")
      setUploadState("error")
      return
    }
    setSelectedFile(file)
    setUploadState("idle")
    setErrorMessage("")
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ""
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadState("uploading")
    setUploadProgress(0)

    // Simulate progress since fetch doesn't give us upload progress natively
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 85))
    }, 200)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("clientId", clientId)
      formData.append("documentType", documentType)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!res.ok) {
        const { error } = (await res.json()) as { error: string }
        throw new Error(error ?? "Upload failed")
      }

      const { documentId } = (await res.json()) as { fileId: string; documentId: string }

      // Optimistically add to list with a minimal ClientDocument shape
      const newDoc: ClientDocument = {
        id: documentId,
        clientId,
        name: selectedFile.name,
        type: documentType,
        anthropicFileId: "",
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
        uploadedAt: new Date(),
      }

      setDocuments((prev) => [newDoc, ...prev])
      setSelectedFile(null)
      setUploadState("success")

      setTimeout(() => setUploadState("idle"), 2000)
    } catch (err) {
      clearInterval(progressInterval)
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.")
      setUploadState("error")
    }
  }

  const handleDelete = async (docId: string) => {
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/upload/${docId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      // Could show a toast here — for now just re-enable the button
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={onInputChange}
          className="sr-only"
        />
        <Upload className={cn("h-8 w-8 mx-auto mb-3", isDragging ? "text-indigo-400" : "text-zinc-600")} />
        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-300">{selectedFile.name}</p>
            <p className="text-xs text-zinc-500">{formatBytes(selectedFile.size)}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">
              Drop a file here or <span className="text-indigo-400 underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-zinc-600">PDF, DOCX, TXT — up to {MAX_SIZE_MB} MB</p>
          </div>
        )}
      </div>

      {/* Controls row */}
      {selectedFile && uploadState !== "success" && (
        <div className="flex items-center gap-3">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors"
            disabled={uploadState === "uploading"}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          <button
            onClick={handleUpload}
            disabled={uploadState === "uploading"}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-indigo-500 hover:bg-indigo-600 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {uploadState === "uploading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </button>
        </div>
      )}

      {/* Progress bar */}
      {uploadState === "uploading" && (
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Success state */}
      {uploadState === "success" && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Document uploaded successfully
        </div>
      )}

      {/* Error state */}
      {uploadState === "error" && errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}

      {/* Documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Uploaded Documents ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
              >
                <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        DOCUMENT_TYPE_COLORS[doc.type]
                      )}
                    >
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                    <span className="text-[10px] text-zinc-600">{formatBytes(doc.sizeBytes)}</span>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(doc.uploadedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="shrink-0 p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                  aria-label="Delete document"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && uploadState !== "uploading" && (
        <p className="text-sm text-zinc-600 text-center py-2">No documents uploaded yet</p>
      )}
    </div>
  )
}
