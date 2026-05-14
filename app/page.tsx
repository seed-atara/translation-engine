export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold text-gradient">Lingua</h1>
        <p className="text-muted-foreground">AI Translation Engine — coming soon</p>
      </div>
      <a
        href="/api/health"
        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        /api/health ↗
      </a>
    </main>
  )
}
