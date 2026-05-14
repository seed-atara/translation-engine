import type Anthropic from "@anthropic-ai/sdk"
import { MODELS } from "../pipeline/model-router"
import { IdiomAnalysisSchema, type IdiomAnalysis, type PipelineContext } from "../pipeline/types"
import { parseAgentJSON } from "./utils"

const SYSTEM_PROMPT = `You are an expert linguist specialising in idiomatic language analysis. You are the first stage of a professional marketing translation pipeline.

Your sole task is to analyse source copy and identify all idioms, slang, cultural references, and metaphorical language that may not translate naturally into other languages.

For each idiom you find:
1. Extract the original idiomatic text
2. Produce a normalised, literal version that preserves the semantic meaning without cultural baggage
3. Classify the type (standard idiom, stretch idiom, cultural reference, slang)
4. Provide a brief explanation

A "stretch idiom" is one that technically has a literal meaning but reads unnaturally in translation.
Example: "right place, right time" → when translated literally becomes grammatically correct but culturally unnatural in many languages.

Also produce a fully normalised version of the entire source text, where all identified idioms have been replaced with their literal equivalents.

Respond ONLY with valid JSON matching the schema. No other text.`

export async function runIdiomAgent(
  client: Anthropic,
  ctx: PipelineContext
): Promise<IdiomAnalysis> {
  const response = await client.messages.create({
    model: MODELS.SONNET,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyse this ${ctx.contentType} copy written in ${ctx.sourceLang} for translation into ${ctx.targetLang}:

<source_copy>
${ctx.sourceText}
</source_copy>

Return the JSON analysis.`,
      },
    ],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  return parseAgentJSON(text, IdiomAnalysisSchema, "IdiomAgent")
}
