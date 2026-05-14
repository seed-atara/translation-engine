import type Anthropic from "@anthropic-ai/sdk"
import { MODELS } from "../pipeline/model-router"
import { SafetyCheckSchema, type SafetyCheck, type PipelineContext } from "../pipeline/types"
import { parseAgentJSON } from "./utils"

const SYSTEM_PROMPT = `You are a brand safety specialist reviewing translated marketing copy for professional agency use.

Your task is to identify any content in the translated text that would be inappropriate for a professional brand, even if it is linguistically natural or even culturally common in the target language.

Flag content that:
1. Is vulgar, crude, or offensive in the target language/culture (even if the source was innocuous)
2. Contains double entendres or sexual connotations inappropriate for professional use
3. Is politically sensitive or divisive
4. References religion, race, gender, or other sensitive topics inappropriately
5. Could create legal or reputational risk for a brand

Example: Spanish "de puta madre" (meaning "something great") is natural and common but would be inappropriate for most brands.

For each flag:
- Extract the exact problematic text
- Explain why it's inappropriate for professional brand use
- Rate severity: low (mildly awkward), medium (clearly inappropriate), high (seriously offensive/risky)
- Provide a clean, brand-safe replacement suggestion
- Indicate whether you have replaced it in the cleanedText

Always return a cleanedText — if no flags, it should be identical to the input.

Respond ONLY with valid JSON matching the schema. No other text.`

export async function runSafetyAgent(
  client: Anthropic,
  ctx: PipelineContext
): Promise<SafetyCheck> {
  const translatedText = ctx.translationResult?.translatedText ?? ""
  const filterEnabled = true // Always run; severity determines action

  const response = await client.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Review this ${ctx.targetLang} translation for brand safety.
${!filterEnabled ? "Note: client has disabled offensive content filtering — flag but do not replace." : ""}

<translated_text>
${translatedText}
</translated_text>

Return the JSON safety check result.`,
      },
    ],
  })

  const text = response.content[0]?.type === "text" ? response.content[0].text : ""
  const raw = await parseAgentJSON(text, SafetyCheckSchema, "SafetyAgent") as Record<string, unknown>

  const rawFlags = Array.isArray(raw["flags"]) ? (raw["flags"] as Record<string, unknown>[]) : []
  const fallbackText = ctx.translationResult?.translatedText ?? ""

  return {
    passed: raw["passed"] !== false && rawFlags.filter((f) => f["severity"] === "high").length === 0,
    flags: rawFlags.map((f) => ({
      text: String(f["text"] ?? f["phrase"] ?? f["content"] ?? ""),
      reason: String(f["reason"] ?? f["explanation"] ?? ""),
      severity: String(f["severity"] ?? "low"),
      suggestion: String(f["suggestion"] ?? f["replacement"] ?? f["alternative"] ?? ""),
      replaced: f["replaced"] === true,
    })),
    cleanedText: String(raw["cleanedText"] ?? raw["cleaned_text"] ?? raw["safeText"] ?? fallbackText),
  }
}
