"use client"

import { useState, useCallback, useRef } from "react"
import { Send, Globe, FileText, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { AgentProgress } from "./AgentProgress"
import { ConfidenceScore } from "./ConfidenceScore"
import { cn } from "@/lib/utils"
import type {
  PipelineEvent,
  PipelineStage,
  PipelineResult,
  IdiomAnalysis,
  CulturalContext,
} from "@/lib/pipeline/types"

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

interface StageData {
  idiom?: IdiomAnalysis
  cultural?: CulturalContext
}

function Expandable({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider hover:bg-zinc-800/40 transition-colors"
      >
        {label}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

export function TranslationWorkspace({ clientId, clientName }: TranslationWorkspaceProps) {
  const [sourceText, setSourceText] = useState("")
  const [targetLang, setTargetLang] = useState("es")
  const [contentType, setContentType] = useState("MARKETING_COPY")
  const [isRunning, setIsRunning] = useState(false)
  const [activeStage, setActiveStage] = useState<PipelineStage | null>(null)
  const [completedStages, setCompletedStages] = useState<PipelineStage[]>([])
  const [stageData, setStageData] = useState<StageData>({})
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [error, setError] = useState<string | undefined>()
  const abortRef = useRef<AbortController | null>(null)

  const runTranslation = useCallback(async () => {
    if (!sourceText.trim() || isRunning) return

    setIsRunning(true)
    setActiveStage(null)
    setCompletedStages([])
    setStageData({})
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
            const stage = event.stage as PipelineStage
            setCompletedStages((prev) => [...prev, stage])
            setActiveStage(null)
            // Capture stage-specific data for display
            if (stage === "idiom") {
              setStageData((prev) => ({ ...prev, idiom: event.data as IdiomAnalysis }))
            } else if (stage === "cultural") {
              setStageData((prev) => ({ ...prev, cultural: event.data as CulturalContext }))
            }
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

      {/* Center: Agent progress + stage details */}
      <div className="w-56 shrink-0 flex flex-col gap-4">
        <AgentProgress
          activeStage={activeStage}
          completedStages={completedStages}
          error={error}
        />

        {/* Idiom analysis detail */}
        {stageData.idiom && (
          <Expandable label={`Idioms (${stageData.idiom.idioms.length})`}>
            {stageData.idiom.idioms.length === 0 ? (
              <p className="text-xs text-zinc-600">No idioms found</p>
            ) : (
              <div className="space-y-2">
                {stageData.idiom.idioms.map((idiom, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-xs text-zinc-300 font-medium">"{idiom.original}"</p>
                    <p className="text-xs text-zinc-500">→ {idiom.normalized}</p>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                      {idiom.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Expandable>
        )}

        {/* Cultural context detail */}
        {stageData.cultural && (
          <Expandable label={`Cultural (${stageData.cultural.culturalNotes.length} notes)`}>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Register</p>
                <p className="text-xs text-indigo-400">{stageData.cultural.preferredRegister}</p>
              </div>
              {stageData.cultural.avoidPhrases.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Avoid</p>
                  <div className="flex flex-wrap gap-1">
                    {stageData.cultural.avoidPhrases.slice(0, 4).map((p, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-900">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stageData.cultural.glossaryMatches.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Glossary</p>
                  <div className="space-y-0.5">
                    {stageData.cultural.glossaryMatches.map((g, i) => (
                      <p key={i} className="text-[10px] text-zinc-500">
                        <span className="text-zinc-400">{g.term}</span> → {g.localEquivalent}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Expandable>
        )}
      </div>

      {/* Right: Output */}
      <div className="flex flex-col flex-1 min-w-0 gap-4 overflow-y-auto">
        {result ? (
          <>
            <ConfidenceScore score={result.confidenceScore} />

            <div className="surface flex-1 p-4 min-h-[200px]">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {result.translatedText || (
                  <span className="text-zinc-600 italic">No translation returned — check pipeline logs</span>
                )}
              </p>
            </div>

            {/* Cultural adaptations */}
            {result.culturalAdaptations.length > 0 && (
              <Expandable label={`Cultural Adaptations (${result.culturalAdaptations.length})`}>
                <ul className="space-y-2">
                  {result.culturalAdaptations.map((note, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex gap-2 leading-relaxed">
                      <span className="text-indigo-500 mt-0.5 shrink-0">·</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </Expandable>
            )}

            {/* Safety flags */}
            {result.safetyFlags.length > 0 && (
              <div className="surface p-4 space-y-2 border border-amber-900/40">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                    Safety Flags ({result.safetyFlags.length})
                  </p>
                </div>
                {result.safetyFlags.map((flag, i) => (
                  <div key={i} className="text-xs space-y-0.5 pl-2 border-l border-amber-900">
                    <p className="text-zinc-500 line-through">{flag.text}</p>
                    <p className="text-emerald-400">→ {flag.suggestion}</p>
                    <p className="text-zinc-500">{flag.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reviewer notes */}
            {result.reviewerNotes && (
              <Expandable label="Reviewer Notes">
                <p className="text-xs text-zinc-400 leading-relaxed">{result.reviewerNotes}</p>
              </Expandable>
            )}
          </>
        ) : (
          <div className="surface flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-2">
              <Globe className="h-8 w-8 text-zinc-800 mx-auto" />
              <p className="text-sm text-zinc-600">Translation will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
