import { db } from "@/lib/db/client"
import { notFound } from "next/navigation"
import { Globe, FileText, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const client = await db.client.findUnique({
    where: { id },
    include: {
      translationJobs: {
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          status: true,
          sourceLang: true,
          targetLang: true,
          contentType: true,
          confidenceScore: true,
          createdAt: true,
        },
      },
      _count: { select: { translationJobs: true, documents: true } },
    },
  })

  if (!client) notFound()

  const STATUS_STYLES: Record<string, string> = {
    COMPLETED: "bg-emerald-950 text-emerald-400 border-emerald-900",
    AWAITING_REVIEW: "bg-amber-950 text-amber-400 border-amber-900",
    PROCESSING: "bg-indigo-950 text-indigo-400 border-indigo-900",
    FAILED: "bg-red-950 text-red-400 border-red-900",
    DRAFT: "bg-zinc-900 text-zinc-500 border-zinc-800",
  }

  const STATUS_LABELS: Record<string, string> = {
    COMPLETED: "Done",
    AWAITING_REVIEW: "Review",
    PROCESSING: "Processing",
    FAILED: "Failed",
    DRAFT: "Draft",
  }

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Globe className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">{client.name}</h1>
              {client.technicalDomain && (
                <p className="text-sm text-zinc-500 mt-0.5">{client.technicalDomain}</p>
              )}
            </div>
          </div>

          <Link
            href={`/translate/${client.id}`}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="h-4 w-4" />
            New translation
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-2xl font-semibold text-zinc-100">{client._count.translationJobs}</p>
          <p className="text-xs text-zinc-500 mt-1">Total translations</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-2xl font-semibold text-zinc-100">{client._count.documents}</p>
          <p className="text-xs text-zinc-500 mt-1">Reference documents</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-2xl font-semibold text-zinc-100">
            {(client.targetLanguages as string[]).length > 0
              ? (client.targetLanguages as string[]).join(", ").toUpperCase()
              : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Target languages</p>
        </div>
      </div>

      {/* Translation history */}
      <div>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Translation History
        </h2>

        {client.translationJobs.length === 0 ? (
          <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl p-10 text-center">
            <Clock className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No translations yet</p>
            <Link
              href={`/translate/${client.id}`}
              className="mt-3 inline-flex text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Start first translation →
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Languages", "Type", "Status", "Confidence", "Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-zinc-500 px-5 py-3 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {client.translationJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 text-sm font-mono text-zinc-300">
                      {job.sourceLang.toUpperCase()} → {job.targetLang.toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">
                      {job.contentType.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_STYLES[job.status] ?? STATUS_STYLES["DRAFT"]}`}
                      >
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400">
                      {job.confidenceScore != null
                        ? `${Math.round(job.confidenceScore * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-600">
                      {new Date(job.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
