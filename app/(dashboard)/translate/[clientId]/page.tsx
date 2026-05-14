import { db } from "@/lib/db/client"
import { notFound } from "next/navigation"
import { TranslationWorkspace } from "@/components/workspace/TranslationWorkspace"
import { ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TranslatePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { _count: { select: { translationJobs: true, translationMemory: true } } },
  })

  if (!client) notFound()

  const initials = client.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col h-screen">
      {/* Workspace header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3.5 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="h-5 w-px bg-zinc-800" />

        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-400">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200 leading-tight">{client.name}</p>
            <p className="text-[10px] text-zinc-500 leading-tight">Translation workspace</p>
          </div>
        </div>

        {/* Memory indicator */}
        <div className="ml-4 flex items-center gap-1.5">
          {client._count.translationMemory > 0 && (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {client._count.translationMemory} memory entries
            </span>
          )}
          {client.targetLanguages.length > 0 && (
            <div className="flex gap-1">
              {client.targetLanguages.slice(0, 4).map((lang) => (
                <span
                  key={lang}
                  className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded"
                >
                  {lang.toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        <Link
          href={`/clients/${clientId}`}
          className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* Workspace */}
      <div className="flex-1 overflow-hidden p-5">
        <TranslationWorkspace clientId={client.id} clientName={client.name} />
      </div>
    </div>
  )
}
