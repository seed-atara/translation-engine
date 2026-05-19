import { db } from "@/lib/db/client"
import { notFound } from "next/navigation"
import { ReviewInterface } from "@/components/review/ReviewInterface"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params

  const job = await db.translationJob.findUnique({
    where: { id: jobId },
    include: {
      client: { select: { name: true } },
      corrections: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!job) notFound()

  // Serialize for client component (Prisma returns Date objects etc.)
  const serializedJob = {
    id: job.id,
    sourceText: job.sourceText,
    sourceLang: job.sourceLang,
    targetLang: job.targetLang,
    contentType: job.contentType as string,
    status: job.status as string,
    translatedText: job.translatedText,
    confidenceScore: job.confidenceScore,
    reviewerNotes: job.reviewerNotes,
    humanReviewRequired: job.humanReviewRequired,
    safetyFlags: job.safetyFlags,
    client: { name: job.client.name },
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top nav bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3.5 flex items-center gap-4">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-5 w-px bg-zinc-800" />
        <div>
          <p className="text-sm font-medium text-zinc-200 leading-tight">Editorial Review</p>
          <p className="text-[10px] text-zinc-500 leading-tight font-mono">{job.id}</p>
        </div>
      </div>

      <ReviewInterface job={serializedJob} />
    </div>
  )
}
