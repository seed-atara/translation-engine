import Link from "next/link"
import { ArrowRight, Languages } from "lucide-react"

interface ClientCardProps {
  client: {
    id: string
    name: string
    targetLanguages: string[]
    _count: { translationJobs: number }
  }
}

export function ClientCard({ client }: ClientCardProps) {
  const initials = client.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition-all group">
      {/* Client header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-indigo-400">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{client.name}</p>
          <p className="text-xs text-zinc-500">
            {client._count.translationJobs === 0
              ? "No translations yet"
              : `${client._count.translationJobs} translation${client._count.translationJobs !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Languages */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Languages className="h-3 w-3 text-zinc-600 shrink-0" />
        {client.targetLanguages.length === 0 ? (
          <span className="text-xs text-zinc-600">No languages configured</span>
        ) : (
          <>
            {client.targetLanguages.slice(0, 5).map((lang) => (
              <span
                key={lang}
                className="text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded"
              >
                {lang.toUpperCase()}
              </span>
            ))}
            {client.targetLanguages.length > 5 && (
              <span className="text-[10px] text-zinc-600">+{client.targetLanguages.length - 5}</span>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <Link
        href={`/translate/${client.id}`}
        className="flex items-center justify-between w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
      >
        Translate
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}
