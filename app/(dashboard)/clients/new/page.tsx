"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

const LANGUAGES = [
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "fi", label: "Finnish" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
]

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLangs, setSelectedLangs] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const body = {
      name: form.get("name") as string,
      industry: form.get("industry") as string,
      targetLanguages: selectedLangs,
      toneOfVoice: form.get("toneDescription")
        ? { description: form.get("toneDescription") as string }
        : null,
    }

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to create client")
      }

      const created = (await res.json()) as { id: string }
      router.push(`/translate/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  function toggleLang(code: string) {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-100">Add client</h1>
        <p className="text-sm text-zinc-500 mt-1">Create a new client instance with brand settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Client name <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="Acme Corporation"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Industry */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Industry</label>
          <input
            name="industry"
            placeholder="e.g. Fashion, Technology, Financial Services"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Tone of voice */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Tone of voice
          </label>
          <textarea
            name="toneDescription"
            rows={3}
            placeholder="e.g. Confident and aspirational. We speak to ambitious professionals. Never corporate jargon — always human, direct, and punchy."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* Target languages */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Target languages
          </label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => {
              const active = selectedLangs.includes(lang.code)
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLang(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-indigo-500 text-white"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  {lang.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Create client
              </>
            )}
          </button>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
