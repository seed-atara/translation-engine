import { z } from "zod"

// ─── Agent Output Schemas ─────────────────────────────────────────────────────

// All schemas are loose passthroughs — normalization done in each agent file
export const IdiomAnalysisSchema = z.object({}).passthrough()
export const CulturalContextSchema = z.object({}).passthrough()

export const TranslationResultSchema = z.object({
  translatedText: z.string(),
  segments: z.array(
    z.object({
      source: z.string(),
      translated: z.string(),
      confidence: z.number().min(0).max(1),
      notes: z.string().optional(),
    })
  ),
  overallConfidence: z.number().min(0).max(1),
  modelUsed: z.string(),
})

export const SafetyCheckSchema = z.object({}).passthrough()

export const QAReportSchema = z.object({}).passthrough()

export type IdiomAnalysis = {
  idioms: { original: string; normalized: string; type: string; explanation: string }[]
  normalizedText: string
  hasComplexIdioms: boolean
}
export type CulturalContext = {
  locale: string
  culturalNotes: string[]
  currentTrends: string[]
  avoidPhrases: string[]
  preferredRegister: string
  glossaryMatches: { term: string; localEquivalent: string }[]
  contentAdaptations: string[]
}
export type TranslationResult = z.infer<typeof TranslationResultSchema>
export type SafetyCheck = {
  passed: boolean
  flags: { text: string; reason: string; severity: string; suggestion: string; replaced: boolean }[]
  cleanedText: string
}
export type QAReport = {
  overallScore: number
  segments: { text: string; score: number; issues: string[] }[]
  reviewerNotes: string
  humanReviewRequired: boolean
  humanReviewPriority: "low" | "medium" | "high"
  strengthAreas: string[]
  improvementAreas: string[]
}

// ─── Pipeline I/O ─────────────────────────────────────────────────────────────

export interface PipelineInput {
  sourceText: string
  sourceLang: string
  targetLang: string
  contentType: string
  clientId: string
  toneOfVoice?: Record<string, unknown>
  audienceProfile?: Record<string, unknown>
  documentFileIds?: string[] // Anthropic Files API file_ids for reference docs
  translationMemory?: Array<{
    sourcePattern: string
    preferredOutput: string
    correctionType: string
  }>
}

export interface PipelineContext extends PipelineInput {
  jobId: string
  idiomAnalysis?: IdiomAnalysis
  culturalContext?: CulturalContext
  translationResult?: TranslationResult
  safetyCheck?: SafetyCheck
  qaReport?: QAReport
}

export interface PipelineResult {
  jobId: string
  translatedText: string
  safetyFlags: SafetyCheck["flags"]
  confidenceScore: number
  reviewerNotes: string
  humanReviewRequired: boolean
  humanReviewPriority: QAReport["humanReviewPriority"]
  culturalAdaptations: string[]
  idiomsProcessed: number
  modelUsed: string
}

// ─── Streaming Events ─────────────────────────────────────────────────────────

export type PipelineStage = "idiom" | "cultural" | "translation" | "safety" | "qa"

export type PipelineEvent =
  | { stage: PipelineStage; status: "running" }
  | { stage: PipelineStage; status: "complete"; data: unknown }
  | { stage: "complete"; result: PipelineResult }
  | { stage: "error"; error: string; retryable: boolean }
