import { cn } from "@/lib/utils"

interface Job {
  id: string
  sourceLang: string
  targetLang: string
  contentType: string
  status: string
  confidenceScore: number | null
  createdAt: Date
  client: { name: string }
}

const STATUS: Record<string, { label: string; class: string }> = {
  PENDING:         { label: "Pending",        class: "text-zinc-400 bg-zinc-800" },
  PROCESSING:      { label: "Processing",     class: "text-indigo-400 bg-indigo-500/10" },
  FAILED:          { label: "Failed",         class: "text-red-400 bg-red-500/10" },
  AWAITING_REVIEW: { label: "Needs review",   class: "text-amber-400 bg-amber-500/10" },
  IN_REVIEW:       { label: "In review",      class: "text-amber-400 bg-amber-500/10" },
  APPROVED:        { label: "Approved",       class: "text-emerald-400 bg-emerald-500/10" },
  REJECTED:        { label: "Rejected",       class: "text-red-400 bg-red-500/10" },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function RecentJobs({ jobs }: { jobs: Job[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            {["Client", "Languages", "Type", "Confidence", "Status", "When"].map((h) => (
              <th key={h} className="text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => {
            const status = STATUS[job.status] ?? { label: job.status, class: "text-zinc-400 bg-zinc-800" }
            const score = job.confidenceScore

            return (
              <tr
                key={job.id}
                className={cn(
                  "hover:bg-zinc-800/40 transition-colors",
                  i < jobs.length - 1 && "border-b border-zinc-800/60"
                )}
              >
                <td className="px-5 py-3.5 text-zinc-200 font-medium">{job.client.name}</td>
                <td className="px-5 py-3.5 font-mono text-zinc-400 text-xs">
                  {job.sourceLang.toUpperCase()} → {job.targetLang.toUpperCase()}
                </td>
                <td className="px-5 py-3.5 text-zinc-400">
                  {job.contentType.replace(/_/g, " ").toLowerCase()}
                </td>
                <td className="px-5 py-3.5">
                  {score !== null ? (
                    <span
                      className={cn(
                        "font-mono text-xs font-medium",
                        score >= 0.85 ? "text-emerald-400" : score >= 0.65 ? "text-amber-400" : "text-red-400"
                      )}
                    >
                      {Math.round(score * 100)}%
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn("text-[10px] font-medium px-2 py-1 rounded-full", status.class)}>
                    {status.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-600">{timeAgo(job.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
