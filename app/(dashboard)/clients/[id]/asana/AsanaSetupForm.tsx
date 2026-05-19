"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Copy, Loader2, Unlink } from "lucide-react"
import Link from "next/link"

interface ExistingConfig {
  workspaceGid: string
  projectGid: string
  webhookSecret: string
}

interface Props {
  clientId: string
  clientName: string
  existingConfig: ExistingConfig | null
}

export function AsanaSetupForm({ clientId, clientName, existingConfig }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const [token, setToken] = useState("")
  const [workspaceGid, setWorkspaceGid] = useState("")
  const [projectGid, setProjectGid] = useState("")

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/clients/${clientId}/asana`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          workspaceGid,
          projectGid,
        }),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to connect Asana")
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect Asana? Existing Asana tasks will remain but no new tasks will be created for future translation jobs."
      )
    ) {
      return
    }

    setDisconnecting(true)
    setError(null)

    try {
      const res = await fetch(`/api/clients/${clientId}/asana`, { method: "DELETE" })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to disconnect Asana")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setDisconnecting(false)
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/clients/${clientId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {clientName}
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-100">Asana integration</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Connect Asana to automatically create review tasks when translation jobs complete.
        </p>
      </div>

      {existingConfig ? (
        /* ── Connected state ──────────────────────────────────────── */
        <div className="space-y-6">
          <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-5 flex items-center gap-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-300">Asana connected</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Workspace GID: <span className="font-mono">{existingConfig.workspaceGid}</span>
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Project GID: <span className="font-mono">{existingConfig.projectGid}</span>
              </p>
            </div>
          </div>

          {/* Webhook secret */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div>
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Webhook secret
              </h3>
              <p className="text-xs text-zinc-600 mt-1">
                Add this as the webhook secret when registering the Asana webhook for this project.
                Used to validate incoming HMAC signatures.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs font-mono text-zinc-400 overflow-auto">
                {existingConfig.webhookSecret}
              </code>
              <button
                type="button"
                onClick={() => copySecret(existingConfig.webhookSecret)}
                className="shrink-0 p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 transition-colors"
                title="Copy to clipboard"
              >
                {copiedSecret ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 text-zinc-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {disconnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Disconnecting…
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4" />
                Disconnect Asana
              </>
            )}
          </button>
        </div>
      ) : (
        /* ── Setup form ───────────────────────────────────────────── */
        <form onSubmit={handleConnect} className="space-y-6">
          {/* PAT */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Personal access token <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-zinc-600">
              Generate one at{" "}
              <a
                href="https://app.asana.com/0/my-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                asana.com/0/my-apps
              </a>{" "}
              → Personal access tokens.
            </p>
            <input
              required
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="1/0000000000000:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>

          {/* Workspace GID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Workspace GID <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-zinc-600">
              Find it in your Asana URL:{" "}
              <span className="font-mono text-zinc-500">
                asana.com/0/<strong>WORKSPACE_GID</strong>/...
              </span>
            </p>
            <input
              required
              type="text"
              value={workspaceGid}
              onChange={(e) => setWorkspaceGid(e.target.value)}
              placeholder="1234567890123456"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>

          {/* Project GID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Project GID <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-zinc-600">
              Navigate to your project in Asana. The number in the URL is the project GID:{" "}
              <span className="font-mono text-zinc-500">
                asana.com/0/workspace/<strong>PROJECT_GID</strong>/list
              </span>
            </p>
            <input
              required
              type="text"
              value={projectGid}
              onChange={(e) => setProjectGid(e.target.value)}
              placeholder="9876543210987654"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-400">
              Asana connected successfully.
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
                  Verifying & connecting…
                </>
              ) : (
                "Connect Asana"
              )}
            </button>
            <Link
              href={`/clients/${clientId}`}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
