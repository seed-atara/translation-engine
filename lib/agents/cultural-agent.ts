import type Anthropic from "@anthropic-ai/sdk"
import { MODELS } from "../pipeline/model-router"
import { CulturalContextSchema, type CulturalContext, type PipelineContext } from "../pipeline/types"
import { parseAgentJSON } from "./utils"

const SYSTEM_PROMPT = `You are a cultural intelligence specialist with deep knowledge of global markets, contemporary language trends, and audience behaviour across all major locales.

You are the second stage of a professional marketing translation pipeline. The source text has already had idioms normalised.

Your task is to research and document:
1. Cultural notes relevant to translating this content into the target locale — things a native speaker would instinctively know
2. Current linguistic trends and zeitgeist in the target market (slang, preferred expressions, what sounds fresh vs dated)
3. Phrases or concepts to actively avoid (offensive, inappropriate for professional brands, outdated)
4. The appropriate register for the audience and content type
5. Any domain-specific glossary terms that should be used consistently

Focus on what will make the translation feel authentically written by a native speaker, not just linguistically correct.

Respond ONLY with valid JSON matching the schema. No other text.`

export async function runCulturalAgent(
  client: Anthropic,
  ctx: PipelineContext
): Promise<CulturalContext> {
  const normalizedText = ctx.idiomAnalysis?.normalizedText ?? ctx.sourceText

  const audienceContext = ctx.audienceProfile
    ? `\n<audience_profile>\n${JSON.stringify(ctx.audienceProfile, null, 2)}\n</audience_profile>`
    : ""

  const response = await client.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyse cultural context for translating this ${ctx.contentType} into ${ctx.targetLang}.
${audienceContext}

<source_copy>
${normalizedText}
</source_copy>

Return the JSON cultural context analysis.`,
      },
    ],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  return parseAgentJSON(text, CulturalContextSchema, "CulturalAgent")
}
