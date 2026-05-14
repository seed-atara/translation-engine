import Anthropic from "@anthropic-ai/sdk"
import { runIdiomAgent } from "../agents/idiom-agent"
import { runCulturalAgent } from "../agents/cultural-agent"
import { runTranslationAgent } from "../agents/translation-agent"
import { runSafetyAgent } from "../agents/safety-agent"
import { runQAAgent } from "../agents/qa-agent"
import { selectTranslationModel } from "./model-router"
import type { PipelineInput, PipelineContext, PipelineEvent, PipelineResult } from "./types"

export async function* runTranslationPipeline(
  input: PipelineInput
): AsyncGenerator<PipelineEvent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const ctx: PipelineContext = { ...input, jobId }

  try {
    // Stage 1: Idiom Detection + Normalization
    yield { stage: "idiom", status: "running" }
    ctx.idiomAnalysis = await runIdiomAgent(client, ctx)
    yield { stage: "idiom", status: "complete", data: ctx.idiomAnalysis }

    // Stage 2: Cultural Context Research
    yield { stage: "cultural", status: "running" }
    ctx.culturalContext = await runCulturalAgent(client, ctx)
    yield { stage: "cultural", status: "complete", data: ctx.culturalContext }

    // Stage 3: Core Translation (model selected based on complexity)
    const model = selectTranslationModel(ctx)
    yield { stage: "translation", status: "running" }
    ctx.translationResult = await runTranslationAgent(client, ctx, model)
    yield { stage: "translation", status: "complete", data: ctx.translationResult }

    // Stage 4: Brand Safety Check
    yield { stage: "safety", status: "running" }
    ctx.safetyCheck = await runSafetyAgent(client, ctx)
    yield { stage: "safety", status: "complete", data: ctx.safetyCheck }

    // Stage 5: QA Scoring + Reviewer Notes
    yield { stage: "qa", status: "running" }
    ctx.qaReport = await runQAAgent(client, ctx)
    yield { stage: "qa", status: "complete", data: ctx.qaReport }

    const result: PipelineResult = {
      jobId,
      translatedText: ctx.safetyCheck.cleanedText,
      safetyFlags: ctx.safetyCheck.flags,
      confidenceScore: ctx.qaReport.overallScore,
      reviewerNotes: ctx.qaReport.reviewerNotes,
      humanReviewRequired: ctx.qaReport.humanReviewRequired,
      humanReviewPriority: ctx.qaReport.humanReviewPriority,
      culturalAdaptations: ctx.culturalContext.culturalNotes,
      idiomsProcessed: ctx.idiomAnalysis.idioms.length,
      modelUsed: ctx.translationResult.modelUsed,
    }

    yield { stage: "complete", result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed"
    const retryable = message.includes("overloaded") || message.includes("rate limit")
    yield { stage: "error", error: message, retryable }
    throw error
  }
}
