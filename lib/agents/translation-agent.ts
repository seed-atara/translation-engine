import type Anthropic from "@anthropic-ai/sdk"
import { TranslationResultSchema, type TranslationResult, type PipelineContext } from "../pipeline/types"
import { parseAgentJSON } from "./utils"

function buildSystemPrompt(ctx: PipelineContext): string {
  return `You are an elite marketing translator and copywriter with native-level fluency in ${ctx.targetLang} and deep expertise in contemporary ${ctx.targetLang} consumer culture, audience psychology, and brand communication.

You produce translations that read as if they were originally written by a ${ctx.targetLang} native speaker — not translated. Every word choice, rhythm, and cultural reference must feel natural and current to a ${ctx.targetLang} reader.

Your translation must:
1. Perfectly embody the client's brand tone of voice
2. Incorporate the cultural context and register provided
3. Apply translation memory corrections as authoritative precedents
4. Maintain meaning fidelity while achieving natural fluency — fluency wins over literal accuracy
5. For technical content: preserve precision and use domain-appropriate terminology
6. Produce per-segment confidence scores reflecting your certainty

Score confidence 0.0–1.0 per segment:
- 1.0: Unambiguous, natural, culturally perfect
- 0.7–0.9: Good translation, minor uncertainty
- 0.5–0.7: Acceptable but may benefit from native review
- Below 0.5: Significant ambiguity, human review essential

Respond ONLY with valid JSON matching the schema. No other text.`
}

function buildUserMessage(ctx: PipelineContext): string {
  const normalizedText = ctx.idiomAnalysis?.normalizedText ?? ctx.sourceText
  const parts: string[] = []

  if (ctx.toneOfVoice) {
    parts.push(`<tone_of_voice>\n${JSON.stringify(ctx.toneOfVoice, null, 2)}\n</tone_of_voice>`)
  }

  if (ctx.audienceProfile) {
    parts.push(`<audience_profile>\n${JSON.stringify(ctx.audienceProfile, null, 2)}\n</audience_profile>`)
  }

  if (ctx.culturalContext) {
    parts.push(`<cultural_context>
Register: ${ctx.culturalContext.preferredRegister}
Cultural notes: ${ctx.culturalContext.culturalNotes.join("; ")}
Avoid: ${ctx.culturalContext.avoidPhrases.join("; ")}
Current trends: ${ctx.culturalContext.currentTrends.join("; ")}
Glossary: ${ctx.culturalContext.glossaryMatches.map((g) => `${g.term} → ${g.localEquivalent}`).join(", ")}
</cultural_context>`)
  }

  if (ctx.translationMemory && ctx.translationMemory.length > 0) {
    const examples = ctx.translationMemory
      .map((m) => `  Source: "${m.sourcePattern}"\n  Approved: "${m.preferredOutput}" [${m.correctionType}]`)
      .join("\n\n")
    parts.push(`<translation_memory>
These are editor-approved corrections for this client. Apply the same style and terminology:
${examples}
</translation_memory>`)
  }

  if (ctx.idiomAnalysis && ctx.idiomAnalysis.idioms.length > 0) {
    const idioms = ctx.idiomAnalysis.idioms
      .map((i) => `  "${i.original}" → normalised to "${i.normalized}" (${i.type})`)
      .join("\n")
    parts.push(`<idioms_processed>
${idioms}
Find natural ${ctx.targetLang} equivalents — do not use the literal normalised forms directly.
</idioms_processed>`)
  }

  parts.push(`<source_copy content_type="${ctx.contentType}" source_lang="${ctx.sourceLang}">
${normalizedText}
</source_copy>`)

  return `${parts.join("\n\n")}\n\nTranslate into ${ctx.targetLang}. Return the JSON translation result.`
}

export async function runTranslationAgent(
  client: Anthropic,
  ctx: PipelineContext,
  model: string
): Promise<TranslationResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserMessage(ctx) },
  ]

  // Include reference documents via Files API if available
  const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(ctx),
        // Prompt cache the system prompt — changes rarely per client
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  }

  const response = await client.messages.create(requestParams, {
    headers:
      (ctx.documentFileIds?.length ?? 0) > 0
        ? { "anthropic-beta": "files-api-2025-04-14" }
        : undefined,
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  const result = await parseAgentJSON(text, TranslationResultSchema, "TranslationAgent")

  return { ...result, modelUsed: model }
}
