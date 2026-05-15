import { db } from "@/lib/db/client"
import { BarChart3, TrendingUp, Globe, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const agency = await db.agency.findFirst()

  const [jobStats, clientCount, languagePairs, recentJobs] = await Promise.all([
    db.translationJob.aggregate({
      where: agency ? { client: { agencyId: agency.id } } : {},
      _count: { _all: true },
      _avg: { confidenceScore: true },
    }),
    db.client.count({ where: agency ? { agencyId: agency.id } : {} }),
    db.translationJob.groupBy({
      by: ["sourceLang", "targetLang"],
      where: agency ? { client: { agencyId: agency.id } } : {},
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
      take: 8,
    }),
    db.translationJob.findMany({
      where: agency ? { client: { agencyId: agency.id } } : {},
      select: {
        status: true,
        confidenceScore: true,
        createdAt: true,
        sourceLang: true,
        targetLang: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  const statusCounts = recentJobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="p-8 max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Performance overview across all clients</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Translations", value: jobStats._count._all, icon: BarChart3 },
          { label: "Active Clients", value: clientCount, icon: Globe },
          {
            label: "Avg Confidence",
            value: jobStats._avg.confidenceScore ? `${Math.round(jobStats._avg.confidenceScore * 100)}%` : "—",
            icon: TrendingUp,
          },
          {
            label: "Pending Review",
            value: statusCounts["AWAITING_REVIEW"] ?? 0,
            icon: Clock,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Icon className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language pairs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Top Language Pairs</h2>
          {languagePairs.length === 0 ? (
            <p className="text-sm text-zinc-600">No translations yet</p>
          ) : (
            <div className="space-y-3">
              {languagePairs.map((pair) => {
                const max = languagePairs[0]!._count._all
                const pct = Math.round((pair._count._all / max) * 100)
                return (
                  <div key={`${pair.sourceLang}-${pair.targetLang}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300 font-mono">
                        {pair.sourceLang} → {pair.targetLang}
                      </span>
                      <span className="text-xs text-zinc-500">{pair._count._all}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Job Status Breakdown</h2>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-zinc-600">No translations yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const colors: Record<string, string> = {
                  COMPLETED: "bg-emerald-500",
                  AWAITING_REVIEW: "bg-amber-500",
                  PROCESSING: "bg-indigo-500",
                  FAILED: "bg-red-500",
                  DRAFT: "bg-zinc-600",
                }
                const labels: Record<string, string> = {
                  COMPLETED: "Completed",
                  AWAITING_REVIEW: "Awaiting Review",
                  PROCESSING: "Processing",
                  FAILED: "Failed",
                  DRAFT: "Draft",
                }
                const total = recentJobs.length
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{labels[status] ?? status}</span>
                      <span className="text-xs text-zinc-500">{count}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[status] ?? "bg-zinc-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
