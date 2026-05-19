"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Languages, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type CorrectionType = "LANGUAGE" | "CULTURAL" | "TONE" | "TERMINOLOGY" | "SAFETY"

interface ReviewJob {
  id: string
  sourceText: string
  sourceLang: string
  targetLang: string
  contentType: string
  status: string
  translatedText: string | null
  confidenceScore: number | null
  reviewerNotes: string | null
  humanReviewRequired: boolean
  safetyFlags: unknown
  client: { name: string }
}

interface ReviewInterfaceProps {
  job: ReviewJob
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const pct = Math.round(score * 100)
  const colorClass =
    pct >= 85
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      : pct >= 65
        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
        : "bg-red-500/10 border-red-500/30 text-red-400"
  return (
    <span className={cn("inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-sm font-medium", colorClass)}>
      {pct}% confidence
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AWAITING_REVIEW: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    IN_REVIEW: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
    APPROVED: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    REJECTED: "bg-red-500/10 border-red-500/30 text-red-400",
    PENDING: "bg-zinc-700/50 border-zinc-600 text-zinc-400",
    PROCESSING: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider",
        map[status] ?? "bg-zinc-700/50 border-zinc-600 text-zinc-400"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

const CORRECTION_TYPES: { value: CorrectionType; label: string; description: string }[] = [
  { value: "LANGUAGE", label: "Language", description: "Grammar, spelling, fluency" },
  { value: "CULTURAL", label: "Cultural", description: "Cultural adaptation" },
  { value: "TONE", label: "Tone", description: "Brand tone adjustment" },
  { value: "TERMINOLOGY", label: "Terminology", description: "Domain-specific terms" },
  { value: "SAFETY", label: "Safety", description: "Content safety issue" },
]

export function ReviewInterface({ job }: ReviewInterfaceProps) {
  const router = useRouter()
  const [editedText, setEditedText] = useState(job.translatedText ?? "")
  const [correctionType, setCorrectionType] = useState<CorrectionType>("LANGUAGE")
  const [editorNote, setEditorNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wasEdited = editedText.trim() !== (job.translatedText ?? "").trim()

  async function handleApprove() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          approvedText: editedText,
          correctionType: wasEdited ? correctionType : undefined,
          editorNote: editorNote.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve job")
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject job")
      setIsSubmitting(false)
    }
  }

  const safetyFlags = Array.isArray(job.safetyFlags) ? (job.safetyFlags as { text: string; reason: string; severity: string; suggestion: string }[]) : []

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-zinc-300">
                {job.sourceLang.toUpperCase()} → {job.targetLang.toUpperCase()}
              </span>
            </div>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-500 font-mono">{job.id.slice(0, 12)}…</span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
              {job.contentType.replace(/_/g, " ")}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-500">{job.client.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge score={job.confidenceScore} />
            <StatusBadge status={job.status} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Human review required banner */}
        {job.humanReviewRequired && (
          <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              This translation has been flagged for human review. Please carefully check the output before approving.
            </p>
          </div>
        )}

        {/* Safety flags */}
        {safetyFlags.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Safety Flags ({safetyFlags.length})
              </p>
            </div>
            {safetyFlags.map((flag, i) => (
              <div key={i} className="text-xs space-y-0.5 pl-3 border-l border-amber-900">
                <p className="text-zinc-500 line-through">{flag.text}</p>
                <p className="text-emerald-400">→ {flag.suggestion}</p>
                <p className="text-zinc-500">{flag.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Two-column: source | translation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Source */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Source — {job.sourceLang.toUpperCase()}
              </p>
            </div>
            <div className="p-4 flex-1">
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {job.sourceText}
              </p>
            </div>
          </div>

          {/* Translation (editable) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Translation — {job.targetLang.toUpperCase()}
              </p>
              {wasEdited && (
                <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                  Edited
                </span>
              )}
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 min-h-[220px] w-full resize-none bg-transparent p-4 text-sm text-zinc-100 leading-relaxed placeholder:text-zinc-600 focus:outline-none font-sans disabled:opacity-60"
              placeholder="Translation output will appear here…"
            />
          </div>
        </div>

        {/* Reviewer notes */}
        {job.reviewerNotes && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">QA Notes</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{job.reviewerNotes}</p>
          </div>
        )}

        {/* Correction controls (shown if text was edited) */}
        {wasEdited && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Correction Details
            </p>
            <div>
              <p className="text-xs text-zinc-400 mb-2">Correction type</p>
              <div className="flex flex-wrap gap-2">
                {CORRECTION_TYPES.map((ct) => (
                  <label
                    key={ct.value}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm transition-colors",
                      correctionType === ct.value
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="correctionType"
                      value={ct.value}
                      checked={correctionType === ct.value}
                      onChange={() => setCorrectionType(ct.value)}
                      className="sr-only"
                    />
                    <span className="font-medium">{ct.label}</span>
                    <span className="text-xs text-zinc-500">{ct.description}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-2">Editor note (optional)</p>
              <input
                type="text"
                value={editorNote}
                onChange={(e) => setEditorNote(e.target.value)}
                placeholder="Explain why this correction was needed…"
                className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting || !editedText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? "Saving…" : wasEdited ? "Approve with corrections" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  )
}
