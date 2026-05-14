import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  sub?: string
  highlight?: boolean
}

export function StatsCard({ label, value, icon: Icon, sub, highlight }: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-zinc-900 border rounded-xl p-5 space-y-3 transition-colors",
        highlight ? "border-amber-500/30" : "border-zinc-800"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <Icon className={cn("h-4 w-4", highlight ? "text-amber-400" : "text-zinc-600")} />
      </div>
      <div>
        <p className={cn("text-3xl font-semibold tracking-tight", highlight ? "text-amber-400" : "text-zinc-100")}>
          {value}
        </p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
