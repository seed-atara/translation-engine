"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe, LayoutDashboard, BarChart3, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Globe className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Lingua</span>
          <span className="ml-auto text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
            BETA
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map((item) => {
          const active = path === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
                active
                  ? "bg-indigo-500/10 text-indigo-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Clients</p>
        </div>

        <Link
          href="/clients/new"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all border border-dashed border-zinc-800 hover:border-zinc-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add client
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 font-mono">Powered by Claude AI</p>
      </div>
    </aside>
  )
}
