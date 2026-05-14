"use client"

import { useState, useCallback, useRef } from "react"
import { Send, Globe, FileText, AlertTriangle, ChevronDown } from "lucide-react"
import { AgentProgress } from "./AgentProgress"
import { ConfidenceScore } from "./ConfidenceScore"
import { cn } from "@/lib/utils"
import type { PipelineEvent, PipelineStage, PipelineResult } from "@/lib/pipeline/types"

const LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Mandarin" },
  { code: "ar", label: "Arabic" },
  { code: "ko", label: "Korean" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "sv", label: "Swedish" },
] as const

const CONTENT_TYPES = [
  "AD_COPY",
  "MARKETING_COPY",
  "SOCIAL_MEDIA",
  "EMAIL",
  "WEBSITE_COPY",
  "PRESS_RELEASE",
  "WHITEPAPER",
  "TECHNICAL_DOC",
] as const

interface TranslationWorkspaceProps {
  clientId: string
  clientName: string
}

export function TranslationWorkspace({ clientId, clientName }: TranslationWorkspaceProps) {
  const [sourceText, setSourceText] = useState("")
  const [targetLang, setTargetLang] = useState("es")
  const [contentType, setContentType] = useState("MARKETING_COPY")
  const [isRunning, setIsRunning] = useState(false)
  const [activeStage, setActiveStage] = useState<PipelineStage | null>(null)
  const [completedStages, setCompletedStages] = useState<PipelineStage[]>([])
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [error, setError] = useState<string | undefined>()
  const abortRef = useRef<AbortController | null>(null)

  const runTranslation = useCallback(async () => {
    if (!sourceText.trim() || isRunning) return

    setIsRunning(true)
    setActiveStage(null)
    setCompletedStages([])
    setResult(null)
    setError(undefined)

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/translate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          sourceText,
          sourceLang: "en",
          targetLang,
          contentType,
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const event: PipelineEvent = JSON.parse(line.slice(6))

          if (event.stage === "error") {
            setError(event.error)
          } else if (event.stage === "complete") {
            setResult(event.result)
            setActiveStage(null)
          } else if (event.status === "running") {
            setActiveStage(event.stage as PipelineStage)
          } else if (event.status === "complete") {
            setCompletedStages((prev) => [...prev, event.stage as PipelineStage])
            setActiveStage(null)
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Connection error. Please try again.")
      }
    } finally {
      setIsRunning(false)
    }
  }, [sourceText, targetLang, contentType, clientId, isRunning])

  return (
    <div className="flex h-full gap-5">
      {/* Left: Input + Controls */}
      <div className="flex flex-col flex-1 min-w-0 gap-4">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 surface px-3 py-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">EN</span>
            <span className="text-border">→</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
              disabled={isRunning}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 surface px-3 py-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
              disabled={isRunning}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source text */}
        <div className="surface flex-1 relative overflow-hidden">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste your copy here…"
            className="h-full w-full resize-none bg-transparent p-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-sans leading-relaxed"
            disabled={isRunning}
          />
          <div className="absolute bottom-3 right-3 text-xs font-mono text-muted-foreground/50">
            {sourceText.length} chars
          </div>
        </div>

        {/* Translate button */}
        <button
          onClick={runTranslation}
          disabled={!sourceText.trim() || isRunning}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            isRunning && "animate-pulse-slow"
          )}
        >
          <Send className="h-4 w-4" />
          {isRunning ? "Translating…" : "Translate"}
        </button>
      </div>

      {/* Center: Agent progress */}
      <div className="w-52 shrink-0">
        <AgentProgress
          activeStage={activeStage}
          completedStages={completedStages}
          error={error}
        />
      </div>

      {/* Right: Output */}
      <div className="flex flex-col flex-1 min-w-0 gap-4">
        {result ? (
          <>
            <ConfidenceScore score={result.confidenceScore} />

            <div className="surface flex-1 overflow-y-auto p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {result.translatedText}
              </p>
            </div>

            {/* Cultural adaptations */}
            {result.culturalAdaptations.length > 0 && (
              <div className="surface p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cultural Adaptations
                </p>
                <ul className="space-y-1">
                  {result.culturalAdaptations.map((note, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary mt-0.5">·</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety flags */}
            {result.safetyFlags.length > 0 && (
              <div className="surface border-warning/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <p className="text-xs font-medium text-warning uppercase tracking-wider">
                    Safety Flags ({result.safetyFlags.length})
                  </p>
                </div>
                {result.safetyFlags.map((flag, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <p className="text-foreground line-through opacity-50">{flag.text}</p>
                    <p className="text-success">→ {flag.suggestion}</p>
                    <p className="text-muted-foreground">{flag.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reviewer notes */}
            {result.reviewerNotes && (
              <div className="surface p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Reviewer Notes
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {result.reviewerNotes}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="surface flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Globe className="h-8 w-8 text-border mx-auto" />
              <p className="text-sm text-muted-foreground">
                Translation will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
