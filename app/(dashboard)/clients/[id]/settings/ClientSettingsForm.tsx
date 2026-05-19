"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react"
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

interface Props {
  id: string
  initialName: string
  initialTechnicalDomain: string
  initialTargetLanguages: string[]
  initialToneDescription: string
  initialAudienceDescription: string
}

export function ClientSettingsForm({
  id,
  initialName,
  initialTechnicalDomain,
  initialTargetLanguages,
  initialToneDescription,
  initialAudienceDescription,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState(initialName)
  const [technicalDomain, setTechnicalDomain] = useState(initialTechnicalDomain)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(initialTargetLanguages)
  const [toneDescription, setToneDescription] = useState(initialToneDescription)
  const [audienceDescription, setAudienceDescription] = useState(initialAudienceDescription)

  function toggleLang(code: string) {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          technicalDomain: technicalDomain.trim() || null,
          targetLanguages: selectedLangs,
          toneOfVoice: toneDescription.trim() ? { description: toneDescription.trim() } : null,
          audienceProfile: audienceDescription.trim()
            ? { description: audienceDescription.trim() }
            : null,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to save settings")
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${name}"? This will permanently remove the client and all associated translation jobs and documents. This cannot be undone.`
      )
    ) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to delete client")
      }

      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setDeleting(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-10">
      {/* Header */}
      <div>
        <Link
          href={`/clients/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to client
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-100">Client settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Update brand configuration and preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ── Identity ─────────────────────────────────────────── */}
        <section className="space-y-5">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Identity</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Client name <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corporation"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Industry / Technical domain
            </label>
            <input
              value={technicalDomain}
              onChange={(e) => setTechnicalDomain(e.target.value)}
              placeholder="e.g. Fashion, Technology, Financial Services"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

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
        </section>

        {/* ── Tone of voice ─────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Tone of voice
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Describe how this client communicates — personality, formality, vocabulary guidelines.
            </p>
          </div>
          <textarea
            rows={4}
            value={toneDescription}
            onChange={(e) => setToneDescription(e.target.value)}
            placeholder="e.g. Confident and aspirational. We speak to ambitious professionals. Never corporate jargon — always human, direct, and punchy."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </section>

        {/* ── Audience profile ──────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Audience profile
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Who is this content for? Demographics, psychographics, language preferences.
            </p>
          </div>
          <textarea
            rows={4}
            value={audienceDescription}
            onChange={(e) => setAudienceDescription(e.target.value)}
            placeholder="e.g. 25–45 urban professionals across Western Europe, digitally native, value authenticity and sustainability."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </section>

        {/* Feedback */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-400">
            Settings saved.
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save settings
              </>
            )}
          </button>
          <Link
            href={`/clients/${id}`}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* ── Danger zone ───────────────────────────────────────────── */}
      <section className="border border-red-900/50 rounded-xl p-6 space-y-3">
        <h2 className="text-xs font-medium text-red-500 uppercase tracking-wider">Danger zone</h2>
        <p className="text-sm text-zinc-400">
          Permanently delete this client and all associated jobs, documents, and translation memory.
          This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 bg-red-950 hover:bg-red-900 border border-red-800 disabled:opacity-50 text-red-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {deleting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Deleting…
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Delete client
            </>
          )}
        </button>
      </section>
    </div>
  )
}
