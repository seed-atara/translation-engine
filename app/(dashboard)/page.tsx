import { db } from "@/lib/db/client"
import { ClientCard } from "@/components/dashboard/ClientCard"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { RecentJobs } from "@/components/dashboard/RecentJobs"
import { Globe, FileText, CheckCircle2, Clock, Plus } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const agency = await db.agency.findFirst()

  if (!agency) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Globe className="h-10 w-10 text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-500">Run <code className="font-mono text-zinc-400">npm run db:seed</code> to set up demo data.</p>
        </div>
      </div>
    )
  }

  const [clients, recentJobs, jobStats, pendingCount] = await Promise.all([
    db.client.findMany({
      where: { agencyId: agency.id },
      include: { _count: { select: { translationJobs: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.translationJob.findMany({
      where: { client: { agencyId: agency.id } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.translationJob.aggregate({
      where: { client: { agencyId: agency.id } },
      _count: { _all: true },
      _avg: { confidenceScore: true },
    }),
    db.translationJob.count({
      where: { client: { agencyId: agency.id }, status: "AWAITING_REVIEW" },
    }),
  ])

  const avgConfidence = jobStats._avg.confidenceScore
  const totalJobs = jobStats._count._all

  return (
    <div className="p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{agency.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {clients.length > 0 && (
          <Link
            href={`/translate/${clients[0]!.id}`}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Translation
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Clients"
          value={clients.length}
          icon={Globe}
          sub="active instances"
        />
        <StatsCard
          label="Translations"
          value={totalJobs}
          icon={FileText}
          sub="all time"
        />
        <StatsCard
          label="Avg Confidence"
          value={avgConfidence ? `${Math.round(avgConfidence * 100)}%` : "—"}
          icon={CheckCircle2}
          sub={totalJobs > 0 ? "across all jobs" : "no data yet"}
        />
        <StatsCard
          label="Pending Review"
          value={pendingCount}
          icon={Clock}
          sub="awaiting editor"
          highlight={pendingCount > 0}
        />
      </div>

      {/* Clients */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Clients</h2>
          <Link href="/clients/new" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            + Add client
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl p-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto">
              <Globe className="h-6 w-6 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">No clients yet</p>
              <p className="text-xs text-zinc-600 mt-1">Add your first client to start translating</p>
            </div>
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first client
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </section>

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Recent Translations</h2>
          <RecentJobs jobs={recentJobs} />
        </section>
      )}
    </div>
  )
}
