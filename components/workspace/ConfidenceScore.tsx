"use client"

import { cn } from "@/lib/utils"

interface ConfidenceScoreProps {
  score: number // 0.0 – 1.0
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function ConfidenceScore({ score, showLabel = true, size = "md" }: ConfidenceScoreProps) {
  const percent = Math.round(score * 100)
  const tier = score >= 0.85 ? "high" : score >= 0.65 ? "medium" : "low"

  const barColor = {
    high: "bg-success",
    medium: "bg-warning",
    low: "bg-destructive",
  }[tier]

  const textColor = {
    high: "text-success",
    medium: "text-warning",
    low: "text-destructive",
  }[tier]

  const label = {
    high: "High confidence",
    medium: "Review recommended",
    low: "Human review required",
  }[tier]

  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2" }

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={cn("text-xs font-mono font-medium", textColor)}>{percent}%</span>
        </div>
      )}
      <div className={cn("w-full bg-secondary rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
