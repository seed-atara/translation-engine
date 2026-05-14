import type Anthropic from "@anthropic-ai/sdk"
import { MODELS } from "../pipeline/model-router"
import { IdiomAnalysisSchema, type IdiomAnalysis, type PipelineContext } from "../pipeline/types"
import { parseAgentJSON } from "./utils"

const SYSTEM_PROMPT = `You are an expert linguist specialising in idiomatic language analysis. You are the first stage of a professional marketing translation pipeline.

Analyse the source copy and identify all idioms, slang, cultural references, and metaphorical language that may not translate naturally.

Respond ONLY with this exact JSON structure — no markdown, no extra text:

{
  "idioms": [
    {
      "original": "the exact phrase from the text",
      "normalized": "literal meaning in plain language",
      "type": "standard",
      "explanation": "why this is idiomatic"
    }
  ],
  "normalizedText": "the full source text with all idioms replaced by their literal equivalents",
  "hasComplexIdioms": true
}

Type must be one of: "standard", "stretch", "cultural_ref", "slang"
A stretch idiom is one that reads unnaturally when translated literally despite being technically correct.
If no idioms found, return an empty idioms array and the original text as normalizedText.`

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
  const raw = await parseAgentJSON(text, IdiomAnalysisSchema, "IdiomAgent") as Record<string, unknown>

  // Normalize whatever Claude returned into our expected shape
  const rawIdioms = Array.isArray(raw["idioms"]) ? (raw["idioms"] as Record<string, unknown>[]) : []
  return {
    idioms: rawIdioms.map((item) => ({
      original: String(item["original"] ?? item["phrase"] ?? item["idiom"] ?? item["text"] ?? ""),
      normalized: String(item["normalized"] ?? item["literal"] ?? item["literalMeaning"] ?? item["meaning"] ?? ""),
      type: String(item["type"] ?? item["idiomType"] ?? item["category"] ?? "standard"),
      explanation: String(item["explanation"] ?? item["reason"] ?? item["note"] ?? ""),
    })),
    normalizedText: String(raw["normalizedText"] ?? raw["normalized_text"] ?? raw["cleanedText"] ?? ctx.sourceText),
    hasComplexIdioms: raw["hasComplexIdioms"] === true,
  }
}
