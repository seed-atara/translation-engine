import { db } from "@/lib/db/client"
import { notFound } from "next/navigation"
import { AsanaSetupForm } from "./AsanaSetupForm"

export const dynamic = "force-dynamic"

export default async function ClientAsanaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const client = await db.client.findUnique({
    where: { id },
    include: { asanaConfig: true },
  })

  if (!client) notFound()

  return (
    <AsanaSetupForm
      clientId={client.id}
      clientName={client.name}
      existingConfig={
        client.asanaConfig
          ? {
              workspaceGid: client.asanaConfig.workspaceGid,
              projectGid: client.asanaConfig.projectGid,
              webhookSecret: client.asanaConfig.webhookSecret,
            }
          : null
      }
    />
  )
}
