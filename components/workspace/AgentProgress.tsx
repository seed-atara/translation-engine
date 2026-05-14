"use client"

import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PipelineStage } from "@/lib/pipeline/types"

const STAGES: { id: PipelineStage; label: string; description: string }[] = [
  { id: "idiom", label: "Idiom Analysis", description: "Detecting cultural expressions" },
  { id: "cultural", label: "Cultural Context", description: "Researching target locale" },
  { id: "translation", label: "Translation", description: "Generating natural copy" },
  { id: "safety", label: "Brand Safety", description: "Filtering inappropriate content" },
  { id: "qa", label: "Quality Review", description: "Scoring and reviewer notes" },
]

type StageStatus = "pending" | "running" | "complete" | "error"

interface AgentProgressProps {
  activeStage: PipelineStage | null
  completedStages: PipelineStage[]
  error?: string
}

export function AgentProgress({ activeStage, completedStages, error }: AgentProgressProps) {
  function getStatus(stageId: PipelineStage): StageStatus {
    if (completedStages.includes(stageId)) return "complete"
    if (activeStage === stageId) return "running"
    return "pending"
  }

  return (
    <div className="surface p-5 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Agent Pipeline
      </p>

      {STAGES.map((stage, i) => {
        const status = getStatus(stage.id)
        const isLast = i === STAGES.length - 1

        return (
          <div key={stage.id} className="flex gap-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <StageIcon status={status} />
              {!isLast && (
                <div
                  className={cn(
                    "w-px flex-1 my-1 transition-colors duration-500",
                    status === "complete" ? "bg-primary/40" : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium transition-colors",
                  status === "running" && "text-foreground",
                  status === "complete" && "text-foreground",
                  status === "pending" && "text-muted-foreground"
                )}
              >
                {stage.label}
              </p>
              {status === "running" && (
                <p className="text-xs text-muted-foreground mt-0.5 animate-fade-in">
                  {stage.description}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {error && (
        <div className="mt-3 rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "complete") {
    return <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
  }
  if (status === "running") {
    return <Loader2 className="h-5 w-5 text-primary shrink-0 animate-spin" />
  }
  return <Circle className="h-5 w-5 text-border shrink-0" />
}
