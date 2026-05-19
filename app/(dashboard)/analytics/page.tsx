import { db } from "@/lib/db/client"
import { BarChart3, TrendingUp, Globe, Clock, AlertCircle, BookMarked } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const agency = await db.agency.findFirst()

  const where = agency ? { client: { agencyId: agency.id } } : {}
  const clientWhere = agency ? { agencyId: agency.id } : {}

  const [jobStats, clientCount, languagePairs, recentJobs, trendJobs, humanReviewCount, memoryByClient] =
    await Promise.all([
      db.translationJob.aggregate({
        where,
        _count: { _all: true },
        _avg: { confidenceScore: true },
      }),
      db.client.count({ where: clientWhere }),
      db.translationJob.groupBy({
        by: ["sourceLang", "targetLang"],
        where,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      db.translationJob.findMany({
        where,
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
      // Last 30 jobs for the trend chart
      db.translationJob.findMany({
        where: { ...where, confidenceScore: { not: null } },
        select: { createdAt: true, confidenceScore: true },
        orderBy: { createdAt: "asc" },
        take: 30,
      }),
      // Human review required count
      db.translationJob.count({
        where: { ...where, humanReviewRequired: true },
      }),
      // Translation memory entries grouped by client
      db.translationMemory.groupBy({
        by: ["clientId"],
        where: agency ? { client: { agencyId: agency.id } } : {},
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ])

  // Resolve client names for memory leaderboard
  const memoryClientIds = memoryByClient.map((m) => m.clientId)
  const memoryClients =
    memoryClientIds.length > 0
      ? await db.client.findMany({
          where: { id: { in: memoryClientIds } },
          select: { id: true, name: true },
        })
      : []
  const clientNameMap = Object.fromEntries(memoryClients.map((c) => [c.id, c.name]))

  const statusCounts = recentJobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const humanReviewRate =
    jobStats._count._all > 0
      ? Math.round((humanReviewCount / jobStats._count._all) * 100)
      : 0

  // Build SVG polyline points for the confidence trend chart
  const SVG_W = 460
  const SVG_H = 120
  const PADDING = { top: 12, right: 12, bottom: 24, left: 32 }
  const chartW = SVG_W - PADDING.left - PADDING.right
  const chartH = SVG_H - PADDING.top - PADDING.bottom

  const trendPoints =
    trendJobs.length > 1
      ? trendJobs
          .map((job, i) => {
            const x = PADDING.left + (i / (trendJobs.length - 1)) * chartW
            const y = PADDING.top + (1 - (job.confidenceScore ?? 0)) * chartH
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          .join(" ")
      : ""

  // Dashed line at y=0.75 threshold
  const thresholdY = PADDING.top + (1 - 0.75) * chartH
  const thresholdX1 = PADDING.left
  const thresholdX2 = PADDING.left + chartW

  // Axis labels: first and last date
  const firstDate = trendJobs[0]
    ? new Date(trendJobs[0].createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : ""
  const lastDate = trendJobs[trendJobs.length - 1]
    ? new Date(trendJobs[trendJobs.length - 1]!.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : ""

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
            value: jobStats._avg.confidenceScore
              ? `${Math.round(jobStats._avg.confidenceScore * 100)}%`
              : "—",
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

      {/* Human review rate + confidence trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Human review required card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-amber-950 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <h2 className="text-sm font-medium text-zinc-300">Human Review Required</h2>
          </div>
          <div>
            <p className="text-4xl font-semibold text-zinc-100">{humanReviewRate}%</p>
            <p className="text-xs text-zinc-500 mt-1">
              {humanReviewCount} of {jobStats._count._all} jobs flagged
            </p>
          </div>
          <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${humanReviewRate}%` }}
            />
          </div>
        </div>

        {/* Confidence trend chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Confidence Score Trend (last 30 jobs)</h2>
          {trendJobs.length < 2 ? (
            <div className="flex items-center justify-center h-[120px]">
              <p className="text-sm text-zinc-600">Not enough data yet</p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ height: SVG_H }}
              aria-label="Confidence score trend chart"
            >
              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = PADDING.top + (1 - tick) * chartH
                return (
                  <g key={tick}>
                    <line
                      x1={PADDING.left - 4}
                      y1={y}
                      x2={thresholdX2}
                      y2={y}
                      stroke="#27272a"
                      strokeWidth={1}
                    />
                    <text
                      x={PADDING.left - 6}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={9}
                      fill="#52525b"
                    >
                      {Math.round(tick * 100)}
                    </text>
                  </g>
                )
              })}

              {/* Threshold dashed line at 75% */}
              <line
                x1={thresholdX1}
                y1={thresholdY}
                x2={thresholdX2}
                y2={thresholdY}
                stroke="#6366f1"
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.5}
              />
              <text
                x={thresholdX2 + 2}
                y={thresholdY + 4}
                fontSize={8}
                fill="#6366f1"
                opacity={0.7}
              >
                75%
              </text>

              {/* Trend line */}
              <polyline
                points={trendPoints}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Data point dots */}
              {trendJobs.map((job, i) => {
                const x = PADDING.left + (i / (trendJobs.length - 1)) * chartW
                const y = PADDING.top + (1 - (job.confidenceScore ?? 0)) * chartH
                return (
                  <circle key={i} cx={x} cy={y} r={2.5} fill="#6366f1" />
                )
              })}

              {/* X-axis date labels */}
              <text
                x={PADDING.left}
                y={SVG_H - 4}
                fontSize={9}
                fill="#52525b"
                textAnchor="start"
              >
                {firstDate}
              </text>
              <text
                x={thresholdX2}
                y={SVG_H - 4}
                fontSize={9}
                fill="#52525b"
                textAnchor="end"
              >
                {lastDate}
              </text>
            </svg>
          )}
        </div>
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

      {/* Translation Memory leaderboard */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <BookMarked className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Translation Memory</h2>
            <p className="text-xs text-zinc-500">Top clients by learning entries — shows the AI improving over time</p>
          </div>
        </div>
        {memoryByClient.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No memory entries yet. Editor corrections will appear here as the system learns.
          </p>
        ) : (
          <div className="space-y-3">
            {memoryByClient.map((entry, rank) => {
              const maxCount = memoryByClient[0]!._count._all
              const pct = Math.round((entry._count._all / maxCount) * 100)
              const name = clientNameMap[entry.clientId] ?? entry.clientId
              return (
                <div key={entry.clientId} className="flex items-center gap-4">
                  <span className="text-xs text-zinc-600 w-4 shrink-0 text-right">{rank + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300 truncate">{name}</span>
                      <span className="text-xs text-zinc-500 ml-2 shrink-0">
                        {entry._count._all} {entry._count._all === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500/70 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
