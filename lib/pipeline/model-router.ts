import type { PipelineContext } from "./types"

const OPUS = "claude-opus-4-7"
const SONNET = "claude-sonnet-4-6"
const HAIKU = "claude-haiku-4-5-20251001"

const TECHNICAL_CONTENT_TYPES = new Set(["WHITEPAPER", "TECHNICAL_DOC"])

export function selectTranslationModel(ctx: PipelineContext): string {
  const isLongForm = ctx.sourceText.length > 3000
  const isTechnical = TECHNICAL_CONTENT_TYPES.has(ctx.contentType)
  const hasReferenceDocs = (ctx.documentFileIds?.length ?? 0) > 0
  const hasComplexIdioms = ctx.idiomAnalysis?.hasComplexIdioms ?? false

  if (isTechnical || (isLongForm && hasReferenceDocs) || hasComplexIdioms) {
    return OPUS
  }
  return SONNET
}

export const MODELS = { OPUS, SONNET, HAIKU } as const
