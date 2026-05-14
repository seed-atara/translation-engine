import type { ZodSchema } from "zod"

export async function parseAgentJSON<T>(
  rawText: string,
  schema: ZodSchema<T>,
  agentName: string
): Promise<T> {
  // Strip markdown code fences if present
  const cleaned = rawText
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`${agentName} returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
    throw new Error(`${agentName} schema validation failed: ${issues}`)
  }

  return result.data
}
