'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-[#1e1a2e] flex flex-col px-6 py-8 shrink-0">
      <div className="mb-10">
        <h1 className="text-[#c4b5f4] text-2xl font-light tracking-widest">cronflow</h1>
        <p className="text-[#8b7db5] text-xs mt-1 tracking-wider">by Mizane AI</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-[#7c5cbf]/20 text-[#c4b5f4] font-medium'
                  : 'text-[#8b7db5] hover:text-[#e8e0ff] hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
