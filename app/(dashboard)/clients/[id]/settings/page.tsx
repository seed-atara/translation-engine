import { db } from "@/lib/db/client"
import { notFound } from "next/navigation"
import { ClientSettingsForm } from "./ClientSettingsForm"

export const dynamic = "force-dynamic"

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const client = await db.client.findUnique({ where: { id } })
  if (!client) notFound()

  // Pull description strings from JSON blobs for the simplified form
  const toneDescription =
    client.toneOfVoice &&
    typeof client.toneOfVoice === "object" &&
    "description" in client.toneOfVoice
      ? String((client.toneOfVoice as Record<string, unknown>).description ?? "")
      : ""

  const audienceDescription =
    client.audienceProfile &&
    typeof client.audienceProfile === "object" &&
    "description" in client.audienceProfile
      ? String((client.audienceProfile as Record<string, unknown>).description ?? "")
      : ""

  return (
    <ClientSettingsForm
      id={client.id}
      initialName={client.name}
      initialTechnicalDomain={client.technicalDomain ?? ""}
      initialTargetLanguages={client.targetLanguages as string[]}
      initialToneDescription={toneDescription}
      initialAudienceDescription={audienceDescription}
    />
  )
}
