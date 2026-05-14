import { z } from "zod"

// ─── Agent Output Schemas ─────────────────────────────────────────────────────

export const IdiomAnalysisSchema = z.object({
  idioms: z.array(
    z.object({
      original: z.string(),
      normalized: z.string(),
      type: z.enum(["standard", "stretch", "cultural_ref", "slang"]),
      explanation: z.string(),
    })
  ),
  normalizedText: z.string(),
  hasComplexIdioms: z.boolean(),
})

export const CulturalContextSchema = z.object({
  locale: z.string(),
  culturalNotes: z.array(z.string()),
  currentTrends: z.array(z.string()),
  avoidPhrases: z.array(z.string()),
  preferredRegister: z.enum(["formal", "semi-formal", "informal", "colloquial"]),
  glossaryMatches: z.array(
    z.object({
      term: z.string(),
      localEquivalent: z.string(),
      notes: z.string().optional(),
    })
  ),
  contentAdaptations: z.array(z.string()),
})

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

export const SafetyCheckSchema = z.object({
  passed: z.boolean(),
  flags: z.array(
    z.object({
      text: z.string(),
      reason: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      suggestion: z.string(),
      replaced: z.boolean(),
    })
  ),
  cleanedText: z.string(),
})

export const QAReportSchema = z.object({
  overallScore: z.number().min(0).max(1),
  segments: z.array(
    z.object({
      text: z.string(),
      score: z.number().min(0).max(1),
      issues: z.array(z.string()),
    })
  ),
  reviewerNotes: z.string(),
  humanReviewRequired: z.boolean(),
  humanReviewPriority: z.enum(["low", "medium", "high"]),
  strengthAreas: z.array(z.string()),
  improvementAreas: z.array(z.string()),
})

export type IdiomAnalysis = z.infer<typeof IdiomAnalysisSchema>
export type CulturalContext = z.infer<typeof CulturalContextSchema>
export type TranslationResult = z.infer<typeof TranslationResultSchema>
export type SafetyCheck = z.infer<typeof SafetyCheckSchema>
export type QAReport = z.infer<typeof QAReportSchema>

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
