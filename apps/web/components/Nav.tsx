'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

export function Nav(): JSX.Element | null {
  const pathname = usePathname()

  if (pathname === '/') return null

  return (
    <header className="sticky top-0 z-[200] border-b border-border/40 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-widest text-foreground transition-colors hover:text-accent"
        >
          AstroDigest
        </Link>

        {/* Centre nav links */}
        <div className="flex items-center gap-0.5">
          {/* Archive — always visible */}
          <Link
            href="/archive"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              pathname === '/archive'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Archive
          </Link>

          {/* Preferences — only shown when signed in */}
          <SignedIn>
            <Link
              href="/preferences"
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === '/preferences'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Preferences
            </Link>
          </SignedIn>
        </div>

        {/* Right side auth */}
        <div className="flex items-center gap-3">
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'size-8',
                  userButtonPopoverCard: 'bg-surface border-border shadow-xl',
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              Sign in
            </Link>
          </SignedOut>
        </div>
      </nav>
    </header>
  )
}
