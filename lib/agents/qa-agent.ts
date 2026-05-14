import type Anthropic from "@anthropic-ai/sdk"
import { MODELS } from "../pipeline/model-router"
import { QAReportSchema, type QAReport, type PipelineContext } from "../pipeline/types"
import { parseAgentJSON } from "./utils"

const SYSTEM_PROMPT = `You are a translation quality assessor for a professional marketing agency. You are the final automated stage before human editorial review.

Assess the translation quality across these dimensions:
- Linguistic fluency: Does it read naturally? Would a native speaker write it this way?
- Semantic accuracy: Does it convey the original meaning faithfully?
- Cultural appropriateness: Is it culturally resonant for the target audience?
- Brand tone consistency: Does it match the intended tone and register?
- Idiom naturalness: Are idioms translated idiomatically (not literally)?
- Segment-level confidence: Score each segment individually

Your reviewer notes should help a human editor prioritise their time:
- Flag segments with low confidence for careful attention
- Note any terminology that may need domain expert verification
- Highlight what was done well so editors can confirm and move on quickly
- Be specific and actionable — vague notes waste editorial time

Set humanReviewRequired to false ONLY if overall score ≥ 0.90 and no flags from safety check.

Respond ONLY with valid JSON matching the schema. No other text.`

export async function runQAAgent(
  client: Anthropic,
  ctx: PipelineContext
): Promise<QAReport> {
  const finalText = ctx.safetyCheck?.cleanedText ?? ctx.translationResult?.translatedText ?? ""
  const safetyFlagCount = ctx.safetyCheck?.flags.length ?? 0

  const response = await client.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Assess quality of this translation from ${ctx.sourceLang} to ${ctx.targetLang}.
Content type: ${ctx.contentType}
Safety flags found: ${safetyFlagCount}

<source_text>
${ctx.sourceText}
</source_text>

<translated_text>
${finalText}
</translated_text>

${ctx.culturalContext ? `Cultural register used: ${ctx.culturalContext.preferredRegister}` : ""}

Return the JSON QA report.`,
      },
    ],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  return parseAgentJSON(text, QAReportSchema, "QAAgent")
}
